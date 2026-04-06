/**
 * SplendorNetwork - WebRTC networking layer for Splendor board game.
 * Uses PeerJS (loaded from CDN) for peer-to-peer connections.
 * Depends on the global `Peer` object provided by PeerJS.
 */

export class SplendorNetwork {
  constructor() {
    this.peer = null;
    this.isHost = false;
    this.roomCode = null;
    this.peerId = null;
    this.connections = new Map(); // peerId -> {conn, playerName}
    this.hostConnection = null; // client's connection to the host
    this.playerName = null;

    // Reconnection bookkeeping: maps peerId -> playerName for players
    // that disconnected so they can reclaim their slot on rejoin.
    this._disconnectedPlayers = new Map();

    // Callback registries
    this._onPlayerJoined = [];
    this._onPlayerLeft = [];
    this._onStateUpdate = [];
    this._onActionReceived = [];
    this._onError = [];
    this._onConnected = [];
    this._onChatReceived = [];
  }

  // ---------------------------------------------------------------------------
  // Public API - Room management
  // ---------------------------------------------------------------------------

  /**
   * Host creates a new game room.
   * Returns the 6-character room code other players use to join.
   */
  async createRoom(playerName) {
    this.playerName = playerName;
    this.isHost = true;
    this.roomCode = this._generateRoomCode();

    const hostPeerId = "splendor-" + this.roomCode;

    await this._initPeer(hostPeerId);

    this.peer.on("connection", (conn) => {
      this._handleIncomingConnection(conn);
    });

    return this.roomCode;
  }

  /**
   * Client joins an existing room by code.
   */
  async joinRoom(roomCode, playerName) {
    this.playerName = playerName;
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase();

    await this._initPeer(undefined);

    const hostPeerId = "splendor-" + this.roomCode;

    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(hostPeerId, { reliable: true });

      const timeout = setTimeout(() => {
        conn.close();
        const err = new Error("Connection to host timed out");
        this._emitError(err);
        reject(err);
      }, 10000);

      conn.on("open", () => {
        clearTimeout(timeout);
        this.hostConnection = conn;
        conn.send({ type: "join", playerName: this.playerName });
        this._setupClientMessageHandler(conn);
        resolve();
      });

      conn.on("error", (err) => {
        clearTimeout(timeout);
        this._emitError(err);
        reject(err);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Public API - Messaging
  // ---------------------------------------------------------------------------

  broadcastState(gameState) {
    if (!this.isHost) return;
    this._broadcast({ type: "state", state: gameState });
  }

  sendAction(action) {
    if (this.isHost) return;
    if (!this.hostConnection) {
      this._emitError(new Error("Not connected to host"));
      return;
    }
    this.hostConnection.send({ type: "action", action, peerId: this.peerId });
  }

  sendChat(message, playerName) {
    const chatMsg = { type: "chat", message, playerName, timestamp: Date.now() };
    if (this.isHost) {
      this._emit(this._onChatReceived, {
        message: chatMsg.message,
        playerName: chatMsg.playerName,
        timestamp: chatMsg.timestamp,
      });
      this._broadcast(chatMsg);
    } else if (this.hostConnection) {
      this.hostConnection.send(chatMsg);
    }
  }

  startGame() {
    if (!this.isHost) return;
    this._broadcast({ type: "start_game" });
  }

  // ---------------------------------------------------------------------------
  // Public API - Callback registration
  // ---------------------------------------------------------------------------

  onPlayerJoined(callback) {
    this._onPlayerJoined.push(callback);
  }

  onPlayerLeft(callback) {
    this._onPlayerLeft.push(callback);
  }

  onStateUpdate(callback) {
    this._onStateUpdate.push(callback);
  }

  onActionReceived(callback) {
    this._onActionReceived.push(callback);
  }

  onError(callback) {
    this._onError.push(callback);
  }

  onConnected(callback) {
    this._onConnected.push(callback);
  }

  onChatReceived(callback) {
    this._onChatReceived.push(callback);
  }

  // ---------------------------------------------------------------------------
  // Public API - Cleanup
  // ---------------------------------------------------------------------------

  destroy() {
    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }

    for (const [, entry] of this.connections) {
      if (entry.conn) {
        entry.conn.close();
      }
    }
    this.connections.clear();
    this._disconnectedPlayers.clear();

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    this.isHost = false;
    this.roomCode = null;
    this.peerId = null;
  }

  // ---------------------------------------------------------------------------
  // Private - Peer initialisation
  // ---------------------------------------------------------------------------

  _initPeer(id) {
    return new Promise((resolve, reject) => {
      // Peer is a global provided by PeerJS CDN script.
      this.peer = id !== undefined ? new Peer(id) : new Peer(); // eslint-disable-line no-undef

      this.peer.on("open", (assignedId) => {
        this.peerId = assignedId;
        resolve();
      });

      this.peer.on("error", (err) => {
        this._emitError(err);
        reject(err);
      });

      this.peer.on("disconnected", () => {
        if (this.peer && !this.peer.destroyed) {
          this.peer.reconnect();
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Private - Host-side connection handling
  // ---------------------------------------------------------------------------

  _handleIncomingConnection(conn) {
    conn.on("open", () => {
      this._setupHostMessageHandler(conn);
    });

    conn.on("error", (err) => {
      this._emitError(err);
    });
  }

  _setupHostMessageHandler(conn) {
    conn.on("data", (data) => {
      if (!data || typeof data !== "object") return;

      switch (data.type) {
        case "join":
          this._handleClientJoin(conn, data.playerName);
          break;

        case "action":
          this._emit(this._onActionReceived, data.action, conn.peer);
          break;

        case "chat": {
          const chatPayload = {
            type: "chat",
            message: data.message,
            playerName: data.playerName,
            timestamp: data.timestamp,
          };
          this._emit(this._onChatReceived, {
            message: data.message,
            playerName: data.playerName,
            timestamp: data.timestamp,
          });
          this._broadcast(chatPayload);
          break;
        }

        default:
          break;
      }
    });

    conn.on("close", () => {
      this._handleClientDisconnect(conn.peer);
    });
  }

  _handleClientJoin(conn, playerName) {
    const clientPeerId = conn.peer;

    if (this._disconnectedPlayers.has(clientPeerId)) {
      this._disconnectedPlayers.delete(clientPeerId);
    }

    this.connections.set(clientPeerId, { conn, playerName });

    conn.send({ type: "welcome", playerName: this.playerName });

    for (const [peerId, entry] of this.connections) {
      if (peerId !== clientPeerId) {
        entry.conn.send({ type: "player_joined", playerName, peerId: clientPeerId });
      }
    }

    for (const [peerId, entry] of this.connections) {
      if (peerId !== clientPeerId) {
        conn.send({ type: "player_joined", playerName: entry.playerName, peerId });
      }
    }

    this._emit(this._onPlayerJoined, playerName, clientPeerId);
  }

  _handleClientDisconnect(clientPeerId) {
    const entry = this.connections.get(clientPeerId);
    if (!entry) return;

    this._disconnectedPlayers.set(clientPeerId, entry.playerName);
    this.connections.delete(clientPeerId);

    for (const [, other] of this.connections) {
      other.conn.send({ type: "player_left", peerId: clientPeerId });
    }

    this._emit(this._onPlayerLeft, clientPeerId);
  }

  // ---------------------------------------------------------------------------
  // Private - Client-side message handling
  // ---------------------------------------------------------------------------

  _setupClientMessageHandler(conn) {
    conn.on("data", (data) => {
      if (!data || typeof data !== "object") return;

      switch (data.type) {
        case "welcome":
          this._emit(this._onConnected);
          break;

        case "state":
          this._emit(this._onStateUpdate, data.state);
          break;

        case "player_joined":
          this._emit(this._onPlayerJoined, data.playerName, data.peerId);
          break;

        case "player_left":
          this._emit(this._onPlayerLeft, data.peerId);
          break;

        case "chat":
          this._emit(this._onChatReceived, {
            message: data.message,
            playerName: data.playerName,
            timestamp: data.timestamp,
          });
          break;

        case "start_game":
          this._emit(this._onStateUpdate, { type: "start_game" });
          break;

        case "error":
          this._emitError(new Error(data.message));
          break;

        default:
          break;
      }
    });

    conn.on("close", () => {
      this.hostConnection = null;
      this._emitError(new Error("Disconnected from host"));
    });
  }

  // ---------------------------------------------------------------------------
  // Private - Broadcasting & event helpers
  // ---------------------------------------------------------------------------

  _broadcast(msg) {
    for (const [, entry] of this.connections) {
      try {
        entry.conn.send(msg);
      } catch (err) {
        this._emitError(err);
      }
    }
  }

  _emit(callbackList, ...args) {
    for (const cb of callbackList) {
      try {
        cb(...args);
      } catch (err) {
        console.error("SplendorNetwork callback error:", err);
      }
    }
  }

  _emitError(error) {
    if (this._onError.length === 0) {
      console.error("SplendorNetwork error (unhandled):", error);
      return;
    }
    this._emit(this._onError, error);
  }

  _generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

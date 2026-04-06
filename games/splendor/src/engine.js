/**
 * Splendor Board Game Engine.
 * Pure game logic — no DOM, no networking. Fully testable.
 */

export const GEM_COLORS = ["white", "blue", "green", "red", "black"];
export const GEM_HEX = {
  white: "#f0f0f0",
  blue: "#2196F3",
  green: "#4CAF50",
  red: "#f44336",
  black: "#424242",
  gold: "#FFD700",
};

export const TIER1_CARDS = [
  // White bonus
  { tier: 1, bonus: "white", points: 0, cost: { blue: 1, green: 1, red: 1, black: 1 } },
  { tier: 1, bonus: "white", points: 0, cost: { red: 2, black: 1 } },
  { tier: 1, bonus: "white", points: 0, cost: { blue: 2, green: 2, black: 1 } },
  { tier: 1, bonus: "white", points: 0, cost: { white: 3, blue: 1, black: 1 } },
  { tier: 1, bonus: "white", points: 0, cost: { blue: 2, black: 2 } },
  { tier: 1, bonus: "white", points: 0, cost: { green: 2, red: 1 } },
  { tier: 1, bonus: "white", points: 0, cost: { blue: 3 } },
  { tier: 1, bonus: "white", points: 1, cost: { green: 4 } },
  // Blue bonus
  { tier: 1, bonus: "blue", points: 0, cost: { white: 1, green: 1, red: 1, black: 1 } },
  { tier: 1, bonus: "blue", points: 0, cost: { white: 1, black: 2 } },
  { tier: 1, bonus: "blue", points: 0, cost: { white: 2, red: 2, black: 1 } },
  { tier: 1, bonus: "blue", points: 0, cost: { blue: 1, green: 3, red: 1 } },
  { tier: 1, bonus: "blue", points: 0, cost: { green: 2, black: 2 } },
  { tier: 1, bonus: "blue", points: 0, cost: { white: 1, red: 2 } },
  { tier: 1, bonus: "blue", points: 0, cost: { black: 3 } },
  { tier: 1, bonus: "blue", points: 1, cost: { red: 4 } },
  // Green bonus
  { tier: 1, bonus: "green", points: 0, cost: { white: 1, blue: 1, red: 1, black: 1 } },
  { tier: 1, bonus: "green", points: 0, cost: { blue: 2, red: 1 } },
  { tier: 1, bonus: "green", points: 0, cost: { white: 1, blue: 1, red: 1, black: 2 } },
  { tier: 1, bonus: "green", points: 0, cost: { blue: 1, red: 3, black: 1 } },
  { tier: 1, bonus: "green", points: 0, cost: { white: 2, blue: 2 } },
  { tier: 1, bonus: "green", points: 0, cost: { red: 2, black: 1 } },
  { tier: 1, bonus: "green", points: 0, cost: { red: 3 } },
  { tier: 1, bonus: "green", points: 1, cost: { black: 4 } },
  // Red bonus
  { tier: 1, bonus: "red", points: 0, cost: { white: 1, blue: 1, green: 1, black: 1 } },
  { tier: 1, bonus: "red", points: 0, cost: { white: 2, green: 1 } },
  { tier: 1, bonus: "red", points: 0, cost: { white: 2, green: 1, black: 2 } },
  { tier: 1, bonus: "red", points: 0, cost: { white: 1, red: 1, black: 3 } },
  { tier: 1, bonus: "red", points: 0, cost: { white: 2, red: 2 } },
  { tier: 1, bonus: "red", points: 0, cost: { blue: 2, green: 1 } },
  { tier: 1, bonus: "red", points: 0, cost: { white: 3 } },
  { tier: 1, bonus: "red", points: 1, cost: { blue: 4 } },
  // Black bonus
  { tier: 1, bonus: "black", points: 0, cost: { white: 1, blue: 1, green: 1, red: 1 } },
  { tier: 1, bonus: "black", points: 0, cost: { green: 1, red: 2 } },
  { tier: 1, bonus: "black", points: 0, cost: { green: 2, red: 1, black: 2 } },
  { tier: 1, bonus: "black", points: 0, cost: { white: 1, green: 1, red: 3 } },
  { tier: 1, bonus: "black", points: 0, cost: { green: 2, red: 2 } },
  { tier: 1, bonus: "black", points: 0, cost: { white: 2, blue: 1 } },
  { tier: 1, bonus: "black", points: 0, cost: { green: 3 } },
  { tier: 1, bonus: "black", points: 1, cost: { white: 4 } },
];

export const TIER2_CARDS = [
  // White bonus
  { tier: 2, bonus: "white", points: 1, cost: { green: 3, red: 2, black: 2 } },
  { tier: 2, bonus: "white", points: 1, cost: { white: 2, blue: 3, red: 3 } },
  { tier: 2, bonus: "white", points: 2, cost: { red: 5 } },
  { tier: 2, bonus: "white", points: 2, cost: { red: 4, black: 1 } },
  { tier: 2, bonus: "white", points: 2, cost: { white: 1, blue: 4, green: 2 } },
  { tier: 2, bonus: "white", points: 3, cost: { white: 6 } },
  // Blue bonus
  { tier: 2, bonus: "blue", points: 1, cost: { blue: 2, green: 2, red: 3 } },
  { tier: 2, bonus: "blue", points: 1, cost: { blue: 2, green: 3, black: 3 } },
  { tier: 2, bonus: "blue", points: 2, cost: { blue: 5 } },
  { tier: 2, bonus: "blue", points: 2, cost: { white: 2, red: 1, black: 4 } },
  { tier: 2, bonus: "blue", points: 2, cost: { green: 5, red: 3 } },
  { tier: 2, bonus: "blue", points: 3, cost: { blue: 6 } },
  // Green bonus
  { tier: 2, bonus: "green", points: 1, cost: { white: 3, green: 2, red: 2 } },
  { tier: 2, bonus: "green", points: 1, cost: { white: 2, blue: 3, black: 2 } },
  { tier: 2, bonus: "green", points: 2, cost: { green: 5 } },
  { tier: 2, bonus: "green", points: 2, cost: { white: 4, blue: 2 } },
  { tier: 2, bonus: "green", points: 2, cost: { blue: 5, green: 3 } },
  { tier: 2, bonus: "green", points: 3, cost: { green: 6 } },
  // Red bonus
  { tier: 2, bonus: "red", points: 1, cost: { white: 2, red: 2, black: 3 } },
  { tier: 2, bonus: "red", points: 1, cost: { blue: 3, red: 2, black: 3 } },
  { tier: 2, bonus: "red", points: 2, cost: { black: 5 } },
  { tier: 2, bonus: "red", points: 2, cost: { white: 3, black: 5 } },
  { tier: 2, bonus: "red", points: 2, cost: { white: 1, blue: 2, green: 4 } },
  { tier: 2, bonus: "red", points: 3, cost: { red: 6 } },
  // Black bonus
  { tier: 2, bonus: "black", points: 1, cost: { white: 3, blue: 2, green: 2 } },
  { tier: 2, bonus: "black", points: 1, cost: { white: 3, green: 3, black: 2 } },
  { tier: 2, bonus: "black", points: 2, cost: { white: 5 } },
  { tier: 2, bonus: "black", points: 2, cost: { green: 1, red: 4, black: 2 } },
  { tier: 2, bonus: "black", points: 2, cost: { white: 5, red: 3 } },
  { tier: 2, bonus: "black", points: 3, cost: { black: 6 } },
];

export const TIER3_CARDS = [
  // White bonus
  { tier: 3, bonus: "white", points: 3, cost: { blue: 3, green: 3, red: 5, black: 3 } },
  { tier: 3, bonus: "white", points: 4, cost: { white: 3, red: 3, black: 6 } },
  { tier: 3, bonus: "white", points: 4, cost: { black: 7 } },
  { tier: 3, bonus: "white", points: 5, cost: { white: 3, black: 7 } },
  // Blue bonus
  { tier: 3, bonus: "blue", points: 3, cost: { white: 3, green: 3, red: 3, black: 5 } },
  { tier: 3, bonus: "blue", points: 4, cost: { white: 6, blue: 3, black: 3 } },
  { tier: 3, bonus: "blue", points: 4, cost: { white: 7 } },
  { tier: 3, bonus: "blue", points: 5, cost: { white: 7, blue: 3 } },
  // Green bonus
  { tier: 3, bonus: "green", points: 3, cost: { white: 5, blue: 3, red: 3, black: 3 } },
  { tier: 3, bonus: "green", points: 4, cost: { white: 3, blue: 6, green: 3 } },
  { tier: 3, bonus: "green", points: 4, cost: { blue: 7 } },
  { tier: 3, bonus: "green", points: 5, cost: { blue: 7, green: 3 } },
  // Red bonus
  { tier: 3, bonus: "red", points: 3, cost: { white: 3, blue: 5, green: 3, black: 3 } },
  { tier: 3, bonus: "red", points: 4, cost: { blue: 3, red: 3, green: 6 } },
  { tier: 3, bonus: "red", points: 4, cost: { green: 7 } },
  { tier: 3, bonus: "red", points: 5, cost: { green: 7, red: 3 } },
  // Black bonus
  { tier: 3, bonus: "black", points: 3, cost: { white: 3, blue: 3, green: 5, red: 3 } },
  { tier: 3, bonus: "black", points: 4, cost: { green: 3, red: 6, black: 3 } },
  { tier: 3, bonus: "black", points: 4, cost: { red: 7 } },
  { tier: 3, bonus: "black", points: 5, cost: { red: 7, black: 3 } },
];

export const NOBLES = [
  { points: 3, requires: { white: 3, blue: 3, black: 3 } },
  { points: 3, requires: { white: 3, green: 3, red: 3 } },
  { points: 3, requires: { blue: 3, green: 3, red: 3 } },
  { points: 3, requires: { white: 3, red: 3, black: 3 } },
  { points: 3, requires: { blue: 3, green: 3, black: 3 } },
  { points: 3, requires: { white: 4, red: 4 } },
  { points: 3, requires: { blue: 4, green: 4 } },
  { points: 3, requires: { white: 4, black: 4 } },
  { points: 3, requires: { white: 4, blue: 4 } },
  { points: 3, requires: { red: 4, black: 4 } },
];

// ============================================================
// SplendorGame Class
// ============================================================

export class SplendorGame {
  constructor(playerCount, playerNames) {
    if (playerCount < 2 || playerCount > 4) {
      throw new Error("Splendor supports 2-4 players.");
    }
    if (playerNames && playerNames.length !== playerCount) {
      throw new Error("Number of names must match player count.");
    }

    this.playerCount = playerCount;
    this.playerNames =
      playerNames || Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);
    this.state = null;
    this.initializeGame();
  }

  // ----------------------------------------------------------
  // Initialization
  // ----------------------------------------------------------

  initializeGame() {
    const tokenCount = this.getTokenCount(this.playerCount);

    const bank = { gold: 5 };
    for (const color of GEM_COLORS) {
      bank[color] = tokenCount;
    }

    const players = [];
    for (let i = 0; i < this.playerCount; i++) {
      players.push({
        id: i,
        name: this.playerNames[i],
        gems: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
        cards: [],
        reserved: [],
        nobles: [],
        isCPU: false,
        cpuDifficulty: null,
      });
    }

    // Deep-copy and shuffle each tier
    const tier1Deck = this.shuffleDeck(TIER1_CARDS.map((c) => this._copyCard(c)));
    const tier2Deck = this.shuffleDeck(TIER2_CARDS.map((c) => this._copyCard(c)));
    const tier3Deck = this.shuffleDeck(TIER3_CARDS.map((c) => this._copyCard(c)));

    const tiers = [
      { deck: tier1Deck, visible: tier1Deck.splice(0, 4) },
      { deck: tier2Deck, visible: tier2Deck.splice(0, 4) },
      { deck: tier3Deck, visible: tier3Deck.splice(0, 4) },
    ];

    // Select nobles: playerCount + 1
    const shuffledNobles = this.shuffleDeck(
      NOBLES.map((n) => ({ ...n, requires: { ...n.requires } })),
    );
    const nobles = shuffledNobles.slice(0, this.playerCount + 1);

    this.state = {
      players,
      bank,
      tiers,
      nobles,
      currentPlayerIndex: 0,
      finalRound: false,
      finalRoundStartPlayer: null,
      gameOver: false,
      winner: null,
      turnPhase: "action",
    };
  }

  getTokenCount(playerCount) {
    switch (playerCount) {
      case 2:
        return 4;
      case 3:
        return 5;
      case 4:
        return 7;
      default:
        return 7;
    }
  }

  shuffleDeck(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  _copyCard(card) {
    return {
      tier: card.tier,
      bonus: card.bonus,
      points: card.points,
      cost: { ...card.cost },
    };
  }

  _totalPlayerGems(player) {
    let total = 0;
    for (const color of GEM_COLORS) {
      total += player.gems[color];
    }
    total += player.gems.gold;
    return total;
  }

  _getPlayerPoints(player) {
    let pts = 0;
    for (const card of player.cards) {
      pts += card.points;
    }
    for (const noble of player.nobles) {
      pts += noble.points;
    }
    return pts;
  }

  _refillVisible(tierIndex) {
    const tier = this.state.tiers[tierIndex];
    while (tier.visible.length < 4 && tier.deck.length > 0) {
      tier.visible.push(tier.deck.pop());
    }
  }

  getCurrentPlayer() {
    return this.state.players[this.state.currentPlayerIndex];
  }

  getPlayerBonuses(player) {
    const bonuses = { white: 0, blue: 0, green: 0, red: 0, black: 0 };
    for (const card of player.cards) {
      bonuses[card.bonus] = (bonuses[card.bonus] || 0) + 1;
    }
    return bonuses;
  }

  canAfford(player, card) {
    const result = this.calculateCost(player, card);
    return result.goldNeeded >= 0;
  }

  /**
   * Returns { gemsToSpend: {color: N}, goldNeeded: N }
   * goldNeeded is -1 if the player cannot afford the card at all.
   */
  calculateCost(player, card) {
    const bonuses = this.getPlayerBonuses(player);
    const gemsToSpend = {};
    let goldNeeded = 0;

    for (const color of GEM_COLORS) {
      const required = card.cost[color] || 0;
      const discount = bonuses[color] || 0;
      const remaining = Math.max(0, required - discount);
      const fromGems = Math.min(remaining, player.gems[color]);
      const shortfall = remaining - fromGems;

      if (fromGems > 0) {
        gemsToSpend[color] = fromGems;
      }
      goldNeeded += shortfall;
    }

    if (goldNeeded > player.gems.gold) {
      return { gemsToSpend, goldNeeded: -1 };
    }

    return { gemsToSpend, goldNeeded };
  }

  // ----------------------------------------------------------
  // Actions
  // ----------------------------------------------------------

  /**
   * Take gems from the bank.
   * Returns { success, error?, needReturn? }
   */
  takeGems(colors) {
    if (this.state.gameOver) return { success: false, error: "Game is over." };
    if (this.state.turnPhase !== "action") {
      return {
        success: false,
        error: `Cannot take gems during '${this.state.turnPhase}' phase.`,
      };
    }

    const player = this.getCurrentPlayer();

    if (!colors || colors.length === 0) {
      return { success: false, error: "Must select at least one gem color." };
    }

    for (const c of colors) {
      if (!GEM_COLORS.includes(c)) {
        return { success: false, error: `Invalid gem color: ${c}` };
      }
    }

    const uniqueColors = [...new Set(colors)];

    if (colors.length === 2 && uniqueColors.length === 1) {
      const color = colors[0];
      if (this.state.bank[color] < 4) {
        return {
          success: false,
          error: `Cannot take 2 ${color} gems: fewer than 4 available in the bank (${this.state.bank[color]}).`,
        };
      }
      this.state.bank[color] -= 2;
      player.gems[color] += 2;
    } else if (uniqueColors.length === colors.length) {
      if (colors.length > 3) {
        return { success: false, error: "Cannot take more than 3 different gem colors." };
      }

      if (colors.length < 3) {
        const availableDistinct = GEM_COLORS.filter((c) => this.state.bank[c] > 0);
        if (availableDistinct.length >= 3 && colors.length < 3) {
          return {
            success: false,
            error: "Must take 3 different colors when at least 3 colors are available in the bank.",
          };
        }
        if (colors.length > availableDistinct.length) {
          return {
            success: false,
            error: `Only ${availableDistinct.length} gem color(s) available in the bank.`,
          };
        }
      }

      for (const color of colors) {
        if (this.state.bank[color] <= 0) {
          return { success: false, error: `No ${color} gems available in the bank.` };
        }
      }

      for (const color of colors) {
        this.state.bank[color] -= 1;
        player.gems[color] += 1;
      }
    } else {
      return {
        success: false,
        error: "Invalid gem selection: must be 3 different colors or 2 of the same color.",
      };
    }

    const totalGems = this._totalPlayerGems(player);
    if (totalGems > 10) {
      this.state.turnPhase = "return_gems";
      return { success: true, needReturn: totalGems - 10 };
    }

    return this._postAction();
  }

  /**
   * Buy a card from the board or from reserved cards.
   */
  buyCard(cardLocation) {
    if (this.state.gameOver) return { success: false, error: "Game is over." };
    if (this.state.turnPhase !== "action") {
      return {
        success: false,
        error: `Cannot buy cards during '${this.state.turnPhase}' phase.`,
      };
    }

    const player = this.getCurrentPlayer();
    let card;
    let fromReserved = false;
    let tierIndex, cardIndex;

    if (cardLocation.reserved !== undefined) {
      cardIndex = cardLocation.reserved;
      if (cardIndex < 0 || cardIndex >= player.reserved.length) {
        return { success: false, error: "Invalid reserved card index." };
      }
      card = player.reserved[cardIndex];
      fromReserved = true;
    } else {
      tierIndex = cardLocation.tier - 1;
      cardIndex = cardLocation.index;
      if (tierIndex < 0 || tierIndex > 2) {
        return { success: false, error: "Invalid tier." };
      }
      const visible = this.state.tiers[tierIndex].visible;
      if (cardIndex < 0 || cardIndex >= visible.length || !visible[cardIndex]) {
        return { success: false, error: "Invalid card index or empty slot." };
      }
      card = visible[cardIndex];
    }

    const costResult = this.calculateCost(player, card);
    if (costResult.goldNeeded < 0) {
      return { success: false, error: "Cannot afford this card." };
    }

    for (const color of GEM_COLORS) {
      const spend = costResult.gemsToSpend[color] || 0;
      if (spend > 0) {
        player.gems[color] -= spend;
        this.state.bank[color] += spend;
      }
    }
    if (costResult.goldNeeded > 0) {
      player.gems.gold -= costResult.goldNeeded;
      this.state.bank.gold += costResult.goldNeeded;
    }

    player.cards.push(card);

    if (fromReserved) {
      player.reserved.splice(cardIndex, 1);
    } else {
      this.state.tiers[tierIndex].visible[cardIndex] = null;
      if (this.state.tiers[tierIndex].deck.length > 0) {
        this.state.tiers[tierIndex].visible[cardIndex] = this.state.tiers[tierIndex].deck.pop();
      }
    }

    return this._postAction();
  }

  /**
   * Reserve a card (face-up or top of deck).
   */
  reserveCard(tier, index) {
    if (this.state.gameOver) return { success: false, error: "Game is over." };
    if (this.state.turnPhase !== "action") {
      return {
        success: false,
        error: `Cannot reserve cards during '${this.state.turnPhase}' phase.`,
      };
    }

    const player = this.getCurrentPlayer();

    if (player.reserved.length >= 3) {
      return { success: false, error: "Cannot reserve more than 3 cards." };
    }

    const tierIndex = tier - 1;
    if (tierIndex < 0 || tierIndex > 2) {
      return { success: false, error: "Invalid tier." };
    }

    let card;

    if (index === null || index === undefined) {
      if (this.state.tiers[tierIndex].deck.length === 0) {
        return { success: false, error: `Tier ${tier} deck is empty.` };
      }
      card = this.state.tiers[tierIndex].deck.pop();
    } else {
      const visible = this.state.tiers[tierIndex].visible;
      if (index < 0 || index >= visible.length || !visible[index]) {
        return { success: false, error: "Invalid card index or empty slot." };
      }
      card = visible[index];
      visible[index] = null;
      if (this.state.tiers[tierIndex].deck.length > 0) {
        visible[index] = this.state.tiers[tierIndex].deck.pop();
      }
    }

    player.reserved.push(card);

    if (this.state.bank.gold > 0) {
      this.state.bank.gold -= 1;
      player.gems.gold += 1;
    }

    const totalGems = this._totalPlayerGems(player);
    if (totalGems > 10) {
      this.state.turnPhase = "return_gems";
      return { success: true, needReturn: totalGems - 10 };
    }

    return this._postAction();
  }

  /**
   * Return gems when player has more than 10 tokens.
   */
  returnGems(gemsToReturn) {
    if (this.state.turnPhase !== "return_gems") {
      return { success: false, error: "Not in return_gems phase." };
    }

    const player = this.getCurrentPlayer();
    const totalGems = this._totalPlayerGems(player);
    const excess = totalGems - 10;

    let returnCount = 0;
    for (const color of [...GEM_COLORS, "gold"]) {
      const amount = gemsToReturn[color] || 0;
      if (amount < 0) {
        return { success: false, error: `Cannot return negative gems.` };
      }
      if (amount > player.gems[color]) {
        return {
          success: false,
          error: `Cannot return ${amount} ${color} gems, player only has ${player.gems[color]}.`,
        };
      }
      returnCount += amount;
    }

    if (returnCount !== excess) {
      return {
        success: false,
        error: `Must return exactly ${excess} gem(s), but returning ${returnCount}.`,
      };
    }

    for (const color of [...GEM_COLORS, "gold"]) {
      const amount = gemsToReturn[color] || 0;
      if (amount > 0) {
        player.gems[color] -= amount;
        this.state.bank[color] += amount;
      }
    }

    return this._postAction();
  }

  // ----------------------------------------------------------
  // Post-action: noble check + turn advance
  // ----------------------------------------------------------

  _postAction() {
    const player = this.getCurrentPlayer();
    const eligibleNobles = this.checkNobles(player);

    if (eligibleNobles.length === 1) {
      this._visitNoble(player, eligibleNobles[0]);
      this.nextTurn();
      return { success: true };
    } else if (eligibleNobles.length > 1) {
      this.state.turnPhase = "choose_noble";
      return { success: true, chooseNoble: eligibleNobles };
    } else {
      this.nextTurn();
      return { success: true };
    }
  }

  checkNobles(player) {
    const bonuses = this.getPlayerBonuses(player);
    const eligible = [];

    for (let i = 0; i < this.state.nobles.length; i++) {
      const noble = this.state.nobles[i];
      let qualifies = true;
      for (const color of GEM_COLORS) {
        if ((noble.requires[color] || 0) > (bonuses[color] || 0)) {
          qualifies = false;
          break;
        }
      }
      if (qualifies) {
        eligible.push({ noble, index: i });
      }
    }

    return eligible;
  }

  chooseNoble(nobleIndex) {
    if (this.state.turnPhase !== "choose_noble") {
      return { success: false, error: "Not in choose_noble phase." };
    }

    const player = this.getCurrentPlayer();
    if (nobleIndex < 0 || nobleIndex >= this.state.nobles.length) {
      return { success: false, error: "Invalid noble index." };
    }

    const noble = this.state.nobles[nobleIndex];
    const bonuses = this.getPlayerBonuses(player);
    for (const color of GEM_COLORS) {
      if ((noble.requires[color] || 0) > (bonuses[color] || 0)) {
        return { success: false, error: "Player does not qualify for this noble." };
      }
    }

    this._visitNoble(player, { noble, index: nobleIndex });
    this.nextTurn();
    return { success: true };
  }

  _visitNoble(player, { noble, index }) {
    player.nobles.push(noble);
    this.state.nobles.splice(index, 1);
  }

  // ----------------------------------------------------------
  // Turn management
  // ----------------------------------------------------------

  nextTurn() {
    this.state.turnPhase = "action";

    const player = this.getCurrentPlayer();

    if (!this.state.finalRound && this._getPlayerPoints(player) >= 15) {
      this.state.finalRound = true;
      this.state.finalRoundStartPlayer = this.state.currentPlayerIndex;
    }

    const nextIndex = (this.state.currentPlayerIndex + 1) % this.playerCount;

    if (this.state.finalRound && nextIndex === this.state.finalRoundStartPlayer) {
      this.state.gameOver = true;
      this.state.turnPhase = "game_over";
      this.state.winner = this.getWinner();
      this.state.currentPlayerIndex = nextIndex;
      return;
    }

    this.state.currentPlayerIndex = nextIndex;
  }

  checkEndGame() {
    return this.state.gameOver;
  }

  getWinner() {
    let bestPlayer = null;
    let bestPoints = -1;
    let bestCards = Infinity;

    for (const player of this.state.players) {
      const pts = this._getPlayerPoints(player);
      const cardCount = player.cards.length;

      if (pts > bestPoints || (pts === bestPoints && cardCount < bestCards)) {
        bestPlayer = player;
        bestPoints = pts;
        bestCards = cardCount;
      }
    }

    return bestPlayer;
  }

  // ----------------------------------------------------------
  // Valid actions
  // ----------------------------------------------------------

  getValidActions() {
    if (this.state.gameOver) return [];
    const player = this.getCurrentPlayer();
    const actions = [];

    if (this.state.turnPhase === "return_gems") {
      actions.push({ type: "return_gems", excess: this._totalPlayerGems(player) - 10 });
      return actions;
    }

    if (this.state.turnPhase === "choose_noble") {
      const eligible = this.checkNobles(player);
      for (const e of eligible) {
        actions.push({ type: "choose_noble", nobleIndex: e.index });
      }
      return actions;
    }

    if (this.state.turnPhase !== "action") return [];

    const availableColors = GEM_COLORS.filter((c) => this.state.bank[c] > 0);

    if (availableColors.length >= 3) {
      const combos = this._combinations(availableColors, 3);
      for (const combo of combos) {
        actions.push({ type: "take_gems", colors: combo });
      }
    } else if (availableColors.length > 0 && availableColors.length < 3) {
      const combos = this._combinations(availableColors, availableColors.length);
      for (const combo of combos) {
        actions.push({ type: "take_gems", colors: combo });
      }
    }

    for (const color of GEM_COLORS) {
      if (this.state.bank[color] >= 4) {
        actions.push({ type: "take_gems", colors: [color, color] });
      }
    }

    for (let t = 0; t < 3; t++) {
      const visible = this.state.tiers[t].visible;
      for (let i = 0; i < visible.length; i++) {
        if (visible[i] && this.canAfford(player, visible[i])) {
          actions.push({ type: "buy_card", cardLocation: { tier: t + 1, index: i } });
        }
      }
    }

    for (let i = 0; i < player.reserved.length; i++) {
      if (this.canAfford(player, player.reserved[i])) {
        actions.push({ type: "buy_card", cardLocation: { reserved: i } });
      }
    }

    if (player.reserved.length < 3) {
      for (let t = 0; t < 3; t++) {
        const visible = this.state.tiers[t].visible;
        for (let i = 0; i < visible.length; i++) {
          if (visible[i]) {
            actions.push({ type: "reserve_card", tier: t + 1, index: i });
          }
        }
        if (this.state.tiers[t].deck.length > 0) {
          actions.push({ type: "reserve_card", tier: t + 1, index: null });
        }
      }
    }

    return actions;
  }

  _combinations(arr, k) {
    const results = [];
    const combo = [];

    function helper(start) {
      if (combo.length === k) {
        results.push([...combo]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        combo.push(arr[i]);
        helper(i + 1);
        combo.pop();
      }
    }

    helper(0);
    return results;
  }

  // ----------------------------------------------------------
  // Serialization
  // ----------------------------------------------------------

  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  loadState(state) {
    this.state = JSON.parse(JSON.stringify(state));
    this.playerCount = this.state.players.length;
    this.playerNames = this.state.players.map((p) => p.name);
  }
}

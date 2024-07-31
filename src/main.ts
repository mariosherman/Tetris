  /**
   * Inside this file you will use the classes and functions from rx.js
   * to add visuals to the svg element in index.html, animate them, and make them interactive.
   *
   * Study and complete the tasks in observable exercises first to get ideas.
   *
   * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
   *
   * You will be marked on your functional programming style
   * as well as the functionality that you implement.
   *
   * Document your code!
   */

  import "./style.css";

  import { fromEvent, interval, merge, Observable,  mergeMap} from "rxjs";
  import { map, filter, scan, tap } from "rxjs/operators";

  /** Constants */

  const Viewport = {
    CANVAS_WIDTH: 200,
    CANVAS_HEIGHT: 400,
    PREVIEW_WIDTH: 160,
    PREVIEW_HEIGHT: 80,
  } as const;

  const Constants = {
    TICK_RATE_MS: 500,
    GRID_WIDTH: 10,
    GRID_HEIGHT: 20,
    ROWS_FOR_LEVEL_UP: 8,
    DEFAULT_TIME_UNTIL_GARBAGE: 31,
    MIN_GARBAGE_ADD_INTERVAL: 5
  } as const;

  const baseRowScore = 40

  const Block = {
    WIDTH: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
    HEIGHT: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
  };

  /** User input */

  type Key = "KeyS" | "KeyA" | "KeyD" | "KeyR" | "KeyW" | "KeyH";

  type Event = "keydown" | "keyup" | "keypress";

  /** Utility functions */

  /** State processing */

  type State = Readonly<{
    gameEnd: boolean;
    currentBlock: BlockState
    nextBlock: BlockState
    holdBlock: BlockState
    blocks: ReadonlyArray<BlockState>
    score: number
    highScore: number
    level : number
    rotationState: number,
    rowsUntilNextLevel: number
    timeUntilNextGarbage: number
  }>;

  WebGL2RenderingContext
  type BlockState = Readonly<{
    grids: ReadonlyArray<{x: number, y: number}>
    color: string
    blockType: BlockType
  }>;

    /** Custom Blocks */
    type BlockType = Readonly<{
      blockGrids: ReadonlyArray<{x: number, y: number}>
      height: number
      width: number
      color: string
      rotationGrids: ReadonlyArray<ReadonlyArray<{x: number, y: number}>>
    }>
      
    const zBlock: BlockType = {
      blockGrids: [
        {x: 0, y: 0},
        {x: 1, y: 0},
        {x: 1, y: 1},
        {x: 2, y: 1}
      ],
      height: 2 * Block.HEIGHT,
      width: 2 * Block.WIDTH,
      color: 'fill: red',
      rotationGrids: [
        [{x: 0, y: -2}, {x: 1, y: -1}, {x: 0, y: 0}, {x: 1, y: 1}],
        [{x: 2, y: 0}, {x: 1, y: 1}, {x: 0, y: 0}, {x: -1, y: 1}],
        [{x: 0, y: 2}, {x: -1, y: 1}, {x: 0, y: 0}, {x: -1, y: -1}],
        [{x: -2, y: 0}, {x: -1, y: -1}, {x: 0, y: 0}, {x: 1, y: -1}]
      ]
    }

    const sBlock: BlockType = {
      blockGrids: [
        {x: 1, y: 0},
        {x: 2, y: 0},
        {x: 0, y: 1},
        {x: 1, y: 1}
      ],
      height: 2 * Block.HEIGHT,
      width: 2 * Block.WIDTH,
      color: 'fill: green',
      rotationGrids: [
        [{x: 1, y: -1}, {x: 2, y: 0}, {x: -1, y: -1}, {x: 0, y: 0}],
        [{x: 1, y: 1}, {x: 0, y: 2}, {x: 1, y: -1}, {x: 0, y: 0}],
        [{x: -1, y: 1}, {x: -2, y: 0}, {x: 1, y: 1}, {x: 0, y: 0}],
        [{x: -1, y: -1}, {x: 0, y: -2}, {x: -1, y: 1}, {x: 0, y: 0}],
      ]
    }

    const iBlock: BlockType = {
      blockGrids: [
        {x: 0, y: 0},
        {x: 1, y: 0},
        {x: 2, y: 0},
        {x: 3, y: 0}
      ],
      height: 2 * Block.HEIGHT,
      width: 2 * Block.WIDTH,
      color: 'fill: cyan',
      rotationGrids: [
        [{x: -1, y: -2}, {x: 0, y: -1}, {x: 1, y: 0}, {x: 2, y: 1}],
        [{x: 2, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 2}],
        [{x: 1, y: 2}, {x: 0, y: 1}, {x: -1, y: 0}, {x: -2, y: -1}],
        [{x: -2, y: 1}, {x: -1, y: 0}, {x: 0, y: -1}, {x: 1, y: -2}],
      ]
    }

    const oBlock: BlockType = {
      blockGrids: [
        {x: 0, y: 0},
        {x: 1, y: 0},
        {x: 0, y: 1},
        {x: 1, y: 1}
      ],
      height: 2 * Block.HEIGHT,
      width: 2 * Block.WIDTH,
      color: 'fill: yellow',
      rotationGrids: [
        [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}],
      ]
    }

    const jBlock  : BlockType = {
      blockGrids: [
        {x: 0, y: 0},
        {x: 1, y: 0},
        {x: 2, y: 0},
        {x: 2, y: 1}
      ],
      height: 2 * Block.HEIGHT,
      width: 2 * Block.WIDTH,
      color: 'fill: blue',
      rotationGrids: [
        [{x: -1, y: -1}, {x: 0, y: 0}, {x: 1, y: 1}, {x: 0, y: 2}],
        [{x: 1, y: -1}, {x: 0, y: 0}, {x: -1, y: 1}, {x: -2, y: 0}],
        [{x: 1, y: 2}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 0, y: -1}],
        [{x: -1, y: 1}, {x: 0, y: 0}, {x: 1, y: -1}, {x: 2, y: 0}],
      ]
    }


    const lBlock: BlockType = {
      blockGrids: [
        {x: 0, y: 0},
        {x: 1, y: 0},
        {x: 2, y: 0},
        {x: 0, y: 1}
      ],
      height: 2 * Block.HEIGHT,
      width: 2 * Block.WIDTH,
      color: 'fill: orange',
      rotationGrids: [
        [{x: -1, y: -1}, {x: 0, y: 0}, {x: 1, y: 1}, {x: -2, y: 0}],
        [{x: 1, y: -1}, {x: 0, y: 0}, {x: -1, y: 1}, {x: 0, y: -2}],
        [{x: 1, y: 2}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 2, y: 1}],
        [{x: -1, y: 0}, {x: 0, y: -1}, {x: 1, y: -2}, {x: 0, y: 1}],
      ]
    }

    const tBlock: BlockType = {
      blockGrids: [
        {x: 0, y: 0},
        {x: 1, y: 0},
        {x: 2, y: 0},
        {x: 1, y: 1}
      ],
      height: 2*Block.HEIGHT,
      width: 2*Block.WIDTH,
      color: 'fill: purple',
      rotationGrids: [
        [{x: -1, y: -1}, {x: 0, y: 0}, {x: 1, y: 1}, {x: -1, y: 1}],
        [{x: 1, y: -1}, {x: 0, y: 0}, {x: -1, y: 1}, {x: -1, y: -1}],
        [{x: 1, y: 2}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}],
        [{x: -1, y: 0}, {x: 0, y: -1}, {x: 1, y: -2}, {x: 1, y: 0}],
      ] 
  }

  const garbageBlock: BlockType = {
    blockGrids: [],
    height: Block.HEIGHT,
    width: Constants.GRID_WIDTH * Block.WIDTH,
    color: 'fill: white',
    rotationGrids:[]
  }

  // Array of all possible block types to be generated
  const blockShapes: ReadonlyArray<BlockType> = [
    iBlock, jBlock, lBlock, oBlock, sBlock, tBlock, zBlock
  ]
 
  /**
   * RNG Class for random numbers
   * Taken from Tutorial 4 and slightly modified
   */      
  abstract class RNG {
    // LCG using GCC's constants
    private static m = 0x80000000; // 2**31
    private static a = 1103515245;
    private static c = 12345;
  
    /**
     * Call `hash` repeatedly to generate the sequence of hashes.
     * @param seed
     * @returns a hash of the seed
     */
    public static hash = (seed: number) => (RNG.a * seed + RNG.c) % RNG.m;
  
    /**
     * Takes hash value and scales it to the range [0, max]
     */
    // public static scale = (hash: number, max: number) => (2 * hash) / (RNG.m - 1) - 1

    public static scale = (hash: number, max: number) => (hash % (max + 1) + max + 1) % (max + 1)
  }

  export function generatePRN(seed:number, max: number): number {
    return RNG.scale(RNG.hash(seed), max)
  }
  
  /**
   * Gets a block type from an array of all available block types
   * @param num number representing index
   * @returns BlockType
   */
  const getBlockType = (num: number)  => {
    return blockShapes[num]
  } 

  /**
   * Updates the state, mainly used when need to generate a new block
   * Case 1: startingState === true
   * Enter this case when starting the game for the first time or when restart is called,
   * keeps highscore, clears all existing blocks on canvas, generates 3 random blocks
   * for player to start with, another as the next block and last for hold block.
   * 
   * Case 2: startingState === false
   * Enter this case when game is ongoing, maintains all current elements within the state
   * with the exception of putting currentBlock into blocks and nextBlocks to currentBlock
   * in order to generate new blocks to keep the game going.
   * 
   * 
   * @param s Current state
   * @param startingState Boolean representing whether given state is for starting/restarting a new game
   * @returns Updated state
   */

  const initializeState = (s: State, startingState: boolean = false, seed: number = 1): State =>{
    const newCurrBlockType =  getBlockType(generatePRN(seed, blockShapes.length-1))
    const newNextBlockType =  getBlockType(generatePRN(seed*32, blockShapes.length-1))
    const newHoldBlockType =  getBlockType(generatePRN(seed*64, blockShapes.length-1))
    return {
      gameEnd: startingState ? false : s.gameEnd,
      blocks: startingState ? [] : [...s.blocks, s.currentBlock],
      score: startingState ? 0 : s.score,
      highScore: (s.score > s.highScore) ? s.score : s.highScore,
      level: startingState ? 1 : 
        s.rowsUntilNextLevel <= 0 ?
        s.level + 1 : s.level,
      rowsUntilNextLevel: startingState ? Constants.ROWS_FOR_LEVEL_UP 
        : s.rowsUntilNextLevel <= 0 ? 
        Math.abs(s.rowsUntilNextLevel - Constants.ROWS_FOR_LEVEL_UP) : s.rowsUntilNextLevel,
      timeUntilNextGarbage: startingState ? Constants.DEFAULT_TIME_UNTIL_GARBAGE : s.timeUntilNextGarbage,
      rotationState: 0,
      currentBlock: 
        startingState ? { 
          grids: newNextBlockType.blockGrids,
          blockType: newNextBlockType,
          color: newNextBlockType.color,
        } 
        : { // If not starting state, replace current block with new block
          grids: s.nextBlock.blockType.blockGrids,
          blockType: s.nextBlock.blockType,
          color: s.nextBlock.color
        }, 
      nextBlock:{
        grids:newCurrBlockType.blockGrids,
        blockType:newCurrBlockType,
        color:newCurrBlockType.color
      },
      holdBlock: startingState ? {
        grids: newHoldBlockType.blockGrids,
        blockType: newHoldBlockType,
        color: newHoldBlockType.color
      }
      : {
        ...s.holdBlock
      }
    }
  }

  /* Initial State */
  const initialState: State = initializeState({
    gameEnd: false,
    currentBlock: { grids: [], color: "", blockType: blockShapes[0]},
    nextBlock: { grids: [], color: "", blockType: blockShapes[1]},
    holdBlock: { grids: [], color: "", blockType: blockShapes[2]},
    blocks: [],
    score: 0,
    highScore: 0,
    level: 0,
    rowsUntilNextLevel: 0,
    timeUntilNextGarbage: 0, 
    rotationState: 0
  }, true)

  /* Actions */
  class MoveLeft{constructor(public readonly moveLength: number) {}}
  class MoveRight{constructor(public readonly moveLength: number) {}}
  class MoveDown{constructor(public readonly moveLength: number) {}}
  class Tick {constructor(public readonly elapsed: number) {}}
  class Restart{}
  class Rotate{constructor(public readonly rotation: number) {}}
  class Hold{}

  /**
   * Updates the state by proceeding with one time step.
   *
   * @param s Current state
   * @returns Updated state
   */
  const tick = (s: State, t: Tick): State => (
    s.timeUntilNextGarbage === 0 ? 
      addGarbage(s, t.elapsed)
    : collisionY(s, 1) ? 
      { 
        ...s,
        currentBlock: {
          ...s.currentBlock,
          grids: s.currentBlock.grids.map(({ x, y }: { x: number, y: number }) => ({ x: x, y: y + 1 }))
        },
        timeUntilNextGarbage: s.timeUntilNextGarbage > 0 ? 
        s.timeUntilNextGarbage - 1 :  Constants.DEFAULT_TIME_UNTIL_GARBAGE - s.level > Constants.MIN_GARBAGE_ADD_INTERVAL ?
         Constants.DEFAULT_TIME_UNTIL_GARBAGE - s.level : Constants.MIN_GARBAGE_ADD_INTERVAL
      }
    : checkGameOver(s) ?
      { 
        ...s,
        gameEnd: true
      }
    : initializeState(clearRows(s, checkRow([...s.blocks, s.currentBlock], Constants.GRID_WIDTH)), false, t.elapsed)
  )
  
  /**
   * Checks for each and every block that none of them are in the first column.
   *
   * @param s Current state
   * @returns true if there are block grids in first column, false if none
   */
  const checkGameOver = (s: State): boolean => {
    // For blocks in the canvas, for grids in these blocks check if any of the grids' y value is === 0 (top of the board)
    return [...s.blocks, s.currentBlock].some((block) => { 
      return block.grids.some(({x, y}: { x: number, y: number }) => y === 0)
    }) 
  }
    
  /**
   * Find the y values where the rows need to be cleared (they are filled)
   * @param blocks array of blocks
   * @param num number representing index
   * @returns BlockType
   */  
  const checkRow = (blocks: ReadonlyArray<BlockState>, n: number): ReadonlyArray<number> => {
    // Get all y values from each grids in each block using flatMap
    return [...blocks.flatMap(block =>
      block.grids.map((grid) => grid.y))
      .reduce((yCountMap, y) => { // Map each y value => {yValue : numOfAppearances}
        yCountMap.set(y, (yCountMap.get(y) || 0) + 1) // .get returns undefined if there's no occurrence of it before so we initialize by 0 then + 1
        return yCountMap;
    }, new Map())
    .entries()].filter(([yValue, count]) => count === n)
    .map(([yValue, count]) => (yValue)) // Filters for the y values where it's appearance is === n indicating the rows in the y value should be cleared
  }

  /**
   * Clears rows that are filled
   * @param s current state
   * @param rowsToClear Array of numbers containing y values where the rows need to be cleared
   * @returns State with cleared rows
   */  
  const clearRows = (s: State, rowsToClear: ReadonlyArray<number>): State => {
    return reorganizeBlocks({
      ...s,
      // Update score based on how many rows were cleared
      score: Math.floor(s.score + baseRowScore * (rowsToClear.length * 2) * (s.level * 1.05)) ,
      rowsUntilNextLevel: s.rowsUntilNextLevel - rowsToClear.length,
      // Filter for block grids which aren't included in rowsToClear
      blocks: s.blocks.map((block) => ({
        ...block,
        grids: block.grids.filter((grid) => !rowsToClear.includes(grid.y)),
      })),
      currentBlock: {
        ...s.currentBlock,
        // Filter for block grids which aren't included in rowsToClear
        grids: s.currentBlock.grids.filter(grid => !rowsToClear.includes(grid.y)), 
      },
    }, rowsToClear)
  }

  /**
   * Drops blocks when a row clear occurs
   * @param s current state
   * @param rowsToClear Array of numbers containing y values where the rows need to be cleared
   * @returns State with reorganized/dropped blocks
   */  
  const reorganizeBlocks = (s: State, rowsToClear: ReadonlyArray<number>): State => {
    return { ...s,
       currentBlock: {
        ...s.currentBlock,
        grids: s.currentBlock.grids.map(grid => ({
          ...grid,
          y: rowsToClear.reduce((acc, curr) => (grid.y < curr ? acc+1 : acc), grid.y)
        }))
       },
        blocks: s.blocks.map(block => ({
        ...block,
        grids: block.grids.map((grid) => ({
            ...grid,
            // If grid.y < row, block needs to be dropped by 1 y
            y: rowsToClear.reduce((acc, curr) => (grid.y < curr ? acc + 1 : acc), grid.y)
        }))
      }))
    }
  }



  /**
   * Rotates blocks if no collission occurs
   * @param s current state
   * @returns State where the currentBlock is rotated
   */    
  const rotateBlock = (s: State) => {
    // Rotation index represents the next arr in the block type's RotationGrids (see custom blocks)
    const rotationIdx = (s.rotationState + 1) %  s.currentBlock.blockType.rotationGrids.length 
    return {
      ...s,
      rotationState: (s.rotationState + 1)  %  s.currentBlock.blockType.rotationGrids.length,
      currentBlock: {
        ...s.currentBlock,
        // Apply addition for each grid in current block by the ones stored in rotationGrids[rotation_idx]
        // in order to move each grid to new positions for rotation to occur
        grids: s.currentBlock.grids.map((acc, i) => ({
          x: acc.x + s.currentBlock.blockType.rotationGrids[rotationIdx][i].x,
          y: acc.y + s.currentBlock.blockType.rotationGrids[rotationIdx][i].y
        }))
      }
    }
  }

  /**
   * Recursion helper function which rotates a block until it reaches it's initial state (unrotated)
   * @param s Current state
   * @returns State where block is back to initial state (unrotated)
   */  
  const rotateUntilInitialState = (s :State): State => {
    // Base case
    if(s.rotationState === 0){
      return s
    }
    // 
    else{
      return rotateUntilInitialState(rotateBlock(s))
    }
  }

  /**
   * Applies rotation to the grids of a block based on rotation state given
   * @param blockType blockType of the Block
   * @param rotationState rotation state of the current state
   * @returns State where currentBlock and holdBlock swapped positions
   */    
  const rotateBaseBlockGrids = (blockType : BlockType, rotationState: number) => {
      return blockType.blockGrids.map((block, i) =>
      // Slice to get only necessary rotationGrids for transformation
      blockType.rotationGrids.slice(1, rotationState + 1).reduce((acc, arr) => ({
        x: acc.x + arr[i].x,
        y: acc.y + arr[i].y,
      }), block)
    )
  }

  /**
   * Gets X and Y differences from of each {x, y} objects from 2 Array of {x, y} objects in order
   * Or can be interpreted as getting the distance of each {x, y} objects from blockGrids1 to the
   * {x, y} objects in blockGrids2 in order.
   * 
   * @param blockGrids1 Array of grids ({x, y} objects)
   * @param blockGrids2 Array of grids ({x, y} objects)
   * @returns Array containing differences of each {x, y} 
   */    
  const getCartesianDifference = (blockGrids1: ReadonlyArray<{x: number, y: number}>, blockGrids2: ReadonlyArray<{x: number, y: number}>) :ReadonlyArray<{x: number, y:number}> => {
    return blockGrids2.map(({x, y}, i) => ({
      x: x - blockGrids1[i].x,
      y: y - blockGrids1[i].y,
    }))
  }

  /**
   * Swaps blocks with the block stored on Hold
   * Process:
   * 1. Get rotated base grids of the current block
   * 2. Get distances from each 'rotated' base grid to the base grids of the block on Hold accordingly
   *    base grids refers to the block type's .blockGrids
   * 3. Transform each x and y value by adding it with the differences we got earlier in order and swap every other element
   *    of current block with the block on Hold
   * 4. Transform each x and y value of the Block on hold by subtracting it with the differences we got earlier in order and swap
   *    every other element of block on Hold with current Block
   * 
   * @param s current state
   * @returns State where currentBlock and holdBlock swapped positions
   */    
  const swapBlocks = (s: State) :State => {
    const blockGridDifferences = getCartesianDifference(s.rotationState === 0 ?
      s.currentBlock.blockType.blockGrids : rotateBaseBlockGrids(s.currentBlock.blockType, s.rotationState), s.holdBlock.blockType.blockGrids)

    // Ternary handles stack overflow in case block can't be rotated due to collision during check in rotateUntilInitialState function
    const unrotatedBlock = (!collisionY(rotateBlock(s), 0) ? rotateUntilInitialState(s) : s)
    return {
      ...s,
      rotationState: 0,
      currentBlock: {
      ...s.holdBlock,
      grids: s.currentBlock.grids.map(({x, y}, i) => ({
        // Transform each grid into the shape of the block on Hold
        x: x + blockGridDifferences[i].x,
        y: y + blockGridDifferences[i].y,
      }))
      },
      holdBlock: {
        // Get unrotated version of the current block to store in hold
        ...unrotatedBlock.currentBlock,
        grids: unrotatedBlock.currentBlock.grids
      }
    }
  }

  /**
   * Lifts all existing block grids by 1 grid
   * @param s current state
   * @returns State where currentBlock and holdBlock swapped positions
   */   
  const liftBlocks = (blocksArr: ReadonlyArray<BlockState>): ReadonlyArray<BlockState> => {
    return blocksArr.map(block => ({
      ...block,
      grids: block.grids.map(grid => ({
          ...grid,
          y: grid.y - 1
      }))
    }))
  }

  /**
   * Lifts all existing blocks by 1 grid and adds garbage blocks for further difficulty
   * Idea inspired by Tetris multiplayer game modes
   * @param s current state
   * @param seed seed to generate random number
   * @returns State with updated block positions and garbage added
   */  
  const addGarbage = (s :State, seed: number): State => {
    return {
      ...s,
      timeUntilNextGarbage: Constants.DEFAULT_TIME_UNTIL_GARBAGE - s.level > Constants.MIN_GARBAGE_ADD_INTERVAL ?
      Constants.DEFAULT_TIME_UNTIL_GARBAGE - s.level : Constants.MIN_GARBAGE_ADD_INTERVAL,
      blocks: [...liftBlocks(s.blocks), {
        //.from(iterable, waytomap)
        // Generate an array of {x, y} objects where y is the bottom of the board and x is from 0 to the board width
        grids: Array.from(
          {length: Constants.GRID_WIDTH}, (_, x) => 
          (x !== generatePRN(seed, Constants.GRID_WIDTH-1) ? {x: x, y: 19} : {x: Constants.GRID_WIDTH, y: 0}))
          .filter((grid) => grid.x < Constants.GRID_WIDTH),
        color: garbageBlock.color,
        blockType: garbageBlock
        }
      ]
    }
  }

  /**
   * State Reducer
   * Heavily referenced from: Tim Dwyer's Asteroids
   * 
   * @param s Current state
   * @param action Action to be taken
   * @param elapsed Time elapsed
   * 
   * @returns Updated state
   */      
  const reduceState = (s: State, action: MoveLeft | MoveRight | MoveDown | Rotate | Restart | Tick | Hold, elapsed: number): State => 
  {
  // Move Left (A Key)
  return action instanceof MoveLeft ?
  collisionX(s, action.moveLength) ? {
    ...s,
    currentBlock: {
      ...s.currentBlock,
      grids: s.currentBlock.grids.map(({x, y}) => ({ x: x + action.moveLength, y: y}))
    }
  } : s
  // Move Right (D Key)
  : action instanceof MoveRight ? 
    collisionX(s, action.moveLength) ? {
      ...s,
      currentBlock: {
        ...s.currentBlock,
        grids: s.currentBlock.grids.map(({x, y}) => ({ x: x + action.moveLength, y: y }))
      }
    } 
    : s
  // Move Down (S Key)
  : action instanceof MoveDown ? 
      collisionY(s, action.moveLength) ? 
      { 
        ...s,
        currentBlock: {
          ...s.currentBlock,
          grids: s.currentBlock.grids.map(({ x, y }: { x: number, y: number }) => ({ x: x, y: y + action.moveLength }))
        }
      }
      : checkGameOver(s)?
      { 
        ...s,
        gameEnd: true
      }
      : initializeState(clearRows(s, checkRow([...s.blocks, s.currentBlock], Constants.GRID_WIDTH)), false, elapsed) 

  // Rotate (W Key)
  : action instanceof Rotate ? 
    collisionX(rotateBlock(s), 0) && collisionY(rotateBlock(s), 0) ?
    rotateBlock(s) : s
  // Restart (R Key)
  : action instanceof Restart ? 
    initializeState(s, true, elapsed)
  // Hold (H Key)
  : action instanceof Hold ?
   swapBlocks(s)
  : tick(s, action)
  }

  // Collision Checking Functions

  /**
  * Check whether blocks will collide when moving in the X-axis (Left / Right)
  *
  * @param s Current state
  * @param moveLength Grid move length
  * @returns Boolean: true if no collisions will occur, false otherwise
  */
  const collisionX = (s: State, moveLength: number): boolean => {
    return s.currentBlock.grids.every(({x, y}) =>
      x + moveLength >= 0 && x + moveLength < Constants.GRID_WIDTH // Check for out of bounds
      && !s.blocks.some((block) => // Check for each block in the canvas that no overlaps occur after 'moveLength' amount of movement
        block.grids.some((grid) => (grid.x == x + moveLength || grid.x == x) && grid.y == y)
      )
    )
  }

  /**
  * Check whether blocks will collide when moving in the X-axis (Left / Right)
  *
  * @param s Current state
  * @param moveLength Grid move length
  * @returns Boolean: true if no collisions will occur, false otherwise
  */
  const collisionY = (s: State, moveLength: number): boolean => {    
    return s.currentBlock.grids.every(({x, y}) =>
    y + moveLength > 0 && y + moveLength < Constants.GRID_HEIGHT // Check for out of bounds
    && !s.blocks.some((block) => // Check for each grid in each block that noone is colliding after 'moveLength' amount of movement
        block.grids.some((grid) => (grid.y == y + moveLength || grid.y == y) && grid.x == x)
      ) 
  )
  }

  /** Rendering (side effects) */

  /**
   * Displays a SVG element on the canvas. Brings to foreground.
   * @param elem SVG element to display
   */
  const show = (elem: SVGGraphicsElement) => {
    elem.setAttribute("visibility", "visible");
    elem.parentNode!.appendChild(elem);
  };

  /**
   * Hides a SVG element on the canvas.
   * @param elem SVG element to hide
   */
  const hide = (elem: SVGGraphicsElement) =>
    elem.setAttribute("visibility", "hidden");

  /**
   * Creates an SVG element with the given properties.
   *
   * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
   * element names and properties.
   *
   * @param namespace Namespace of the SVG element
   * @param name SVGElement name
   * @param props Properties to set on the SVG element
   * @returns SVG element
   */
  const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {}
  ) => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
  };

  /**
   * This is the function called on page load. Your main game loop
   * should be called here.
   */
  export function main() {
    // Canvas elements
    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
      HTMLElement;
    const preview = document.querySelector("#svgPreview") as SVGGraphicsElement &
      HTMLElement;
    const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
      HTMLElement;
    const container = document.querySelector("#main") as HTMLElement;

    // Custom Addition (Hold feature inspired by Tetris, displays the block on hold)
    const hold = document.querySelector("#svgHold") as SVGGraphicsElement &
    HTMLElement;

    svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
    svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
    preview.setAttribute("height", `${Viewport.PREVIEW_HEIGHT}`);
    preview.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);
    // Hold
    hold.setAttribute("height",`${Viewport.PREVIEW_HEIGHT}`);
    hold.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);


    // Text fields
    const levelText = document.querySelector("#levelText") as HTMLElement;
    const scoreText = document.querySelector("#scoreText") as HTMLElement;
    const highScoreText = document.querySelector("#highScoreText") as HTMLElement;
    const garbageTimerText = document.querySelector("#garbagetimerText") as HTMLElement;

    /** User input */

    const key$ = fromEvent<KeyboardEvent>(document, "keypress");
    const fromKey = (keyCode: Key) =>
      key$.pipe(filter(({ code }) => code === keyCode));


    /** Observables */

    /** Determines the rate of time steps */
    const tick$ = interval(Constants.TICK_RATE_MS)
    .pipe(map((elapsed) => new Tick(elapsed)))

  /**
  * Clears all elements within the canvas (mainly for blocks),
  * keeps gameOver element for game over screen.
  *  
  * Used for handling each render to update display with the most recently updated state,
  * avoids blocks overlapping on the displayed canvas.
  *
  * @param svgElem svg element
  * @returns void
  */
  const clearSvg = (svgElem : SVGGraphicsElement) => {
      Array.from(svgElem.childNodes).forEach((childNode) => {
      if (childNode !== gameover) {
        svgElem.removeChild(childNode)
      }
    })
  }
  
    /**
     * Renders the current state to the canvas.
     *
     * In MVC terms, this updates the View using the Model.
     *
     * @param s Current state
     */
    const render = (s: State) => {

      // Clears all blocks within the canvas / preview
      clearSvg(svg)
      clearSvg(preview)
      clearSvg(hold),

      // Blocks to be rendered (not including hold block)
      
      [...s.blocks, s.currentBlock, s.nextBlock].forEach((block) => {
        block.grids.forEach((grid) => {
          // Create SVG Elements to add to canvas
          const blockSvg = createSvgElement(
            svg.namespaceURI,
            "rect",
            {
              x: block ===  s.nextBlock  ? `${grid.x * Block.WIDTH + 2.5 * Block.WIDTH}`: `${grid.x * Block.WIDTH}`,
              y: block === s.nextBlock ? `${grid.y * Block.HEIGHT + Block.WIDTH}`: `${grid.y * Block.HEIGHT}`,
              width: `${Block.WIDTH}`,
              height: `${Block.HEIGHT}`,
              style: block.color,
            }
          )
          // Check whether it's should be displayed on preview or in the board
          block ===  s.nextBlock ? preview.appendChild(blockSvg) 
          : svg.appendChild(blockSvg) 
        })
      })

      // Separate for rendering hold block to handle render going out of bounds for the hold box
      s.holdBlock.blockType.blockGrids.forEach((grid) => {
        const blockSvg = createSvgElement(
          svg.namespaceURI,
          "rect",
          {
            x:`${grid.x * Block.WIDTH + 2.5 * Block.WIDTH}`,
            y: `${grid.y * Block.HEIGHT + Block.WIDTH}`,
            width: `${Block.WIDTH}`,
            height: `${Block.HEIGHT}`,
            style: s.holdBlock.color,
            }
          )
            hold.appendChild(blockSvg)
          })
        }

    /* Movement Key Observables */
    const left$ = key$.pipe(
      filter(event => event.code === 'KeyA'),
      map(_ => new MoveLeft(-1))
    );
    const right$ = key$.pipe(
      filter(event => event.code === 'KeyD'),
      map(_ => new MoveRight(1))
    );
    const down$ = key$.pipe(
      filter(event => event.code === 'KeyS'),
      map(_ => new MoveDown(1))
    );
    const restart$ = key$.pipe(
      filter(event => event.code === 'KeyR'),
      map(_ => new Restart)
    )
    const rotate$ = key$.pipe(
      filter( event => event.code === 'KeyW'),
      map(_ => new Rotate(1))
    )
    const hold$ = key$.pipe(
      filter( event => event.code === 'KeyH'),
      map(_ => new Hold)
    )
    
    // Merge all movement key observables
    const movement$ = merge(left$, right$, down$, restart$, rotate$, hold$)

    const source$ = merge(tick$, movement$)
      .pipe(
        scan(
        (s: State, action, elapsed) => reduceState(s, action, elapsed),
        initialState),
      )
      .subscribe((s: State) => {
        render(s)
        if (s.gameEnd) {
          show(gameover)
        } else {
          hide(gameover)
        }
        scoreText.innerHTML = `${s.score}`
        highScoreText.innerHTML = `${s.highScore}`
        levelText.innerHTML = `${s.level}`
        garbageTimerText.innerHTML = `${s.timeUntilNextGarbage}`
      })
  } 


  // The following simply runs your main function on window load.  Make sure to leave it in place.
  if (typeof window !== "undefined") {
    window.onload = () => {
      main();
    };
  }

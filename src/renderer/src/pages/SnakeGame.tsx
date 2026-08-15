/**
 * @author Harriol
 */
import { useEffect, useRef, useState } from 'react';
import { Card, Button, Space, Statistic } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, TrophyOutlined } from '@ant-design/icons';

// ============ Game Constants ============
const GRID_SIZE = 20;
const CELL_SIZE = 25;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const INITIAL_SPEED = 150;
const SPEED_INCREASE = 5;
const MIN_SPEED = 60;

// ============ Types ============
interface Point { x: number; y: number }
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type GameStatus = 'idle' | 'running' | 'paused' | 'over';

const DIR_VEC: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};
const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
};

// ============ Pure helpers ============
export function createSnake(): Point[] {
  const mid = Math.floor(GRID_SIZE / 2);
  return [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
}

export function randomFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let x = 0; x < GRID_SIZE; x++) for (let y = 0; y < GRID_SIZE; y++) if (!occupied.has(`${x},${y}`)) free.push({ x, y });
  return free.length > 0 ? free[Math.floor(Math.random() * free.length)] : { x: 0, y: 0 };
}

export function loadHighScore(): number {
  try { return Number(localStorage.getItem('snake_high_score')) || 0; } catch { return 0; }
}

// ============ Component ============
function SnakeGame(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  // ---- Mutable game state (read by game loop, never triggers re-render) ----
  const g = useRef({
    snake: createSnake(),
    food: randomFood(createSnake()),
    direction: 'RIGHT' as Direction,
    nextDirection: 'RIGHT' as Direction,
    status: 'idle' as GameStatus,
    score: 0,
    speed: INITIAL_SPEED,
    lastTick: 0,
  });

  // ---- React state (UI display only) ----
  const [status, setStatus] = useState<GameStatus>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(loadHighScore);
  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore; // always fresh for closures

  // ---- Sync game → UI ----
  function syncUI(s: GameStatus, sc: number) {
    g.current.status = s;
    g.current.score = sc;
    setStatus(s);
    setScore(sc);
  }

  // ---- Shared init ----
  function initGame(initialStatus: GameStatus) {
    const snake = createSnake();
    g.current = {
      snake,
      food: randomFood(snake),
      direction: 'RIGHT',
      nextDirection: 'RIGHT',
      status: initialStatus,
      score: 0,
      speed: INITIAL_SPEED,
      lastTick: performance.now(),
    };
    setStatus(initialStatus);
    setScore(0);
  }

  // ---- Game over ----
  function triggerGameOver() {
    syncUI('over', g.current.score);
    if (g.current.score > highScoreRef.current) {
      const h = g.current.score;
      setHighScore(h);
      try { localStorage.setItem('snake_high_score', String(h)); } catch { /* noop */ }
    }
  }

  // ---- Drawing ----
  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { snake, food, status: st } = g.current;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const p = i * CELL_SIZE;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, CANVAS_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(CANVAS_SIZE, p); ctx.stroke();
    }

    // Food
    if (food) {
      const cx = food.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = food.y * CELL_SIZE + CELL_SIZE / 2;
      ctx.fillStyle = 'rgba(255, 77, 79, 0.3)';
      ctx.beginPath(); ctx.arc(cx, cy, CELL_SIZE / 2 + 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff4d4f';
      ctx.beginPath(); ctx.arc(cx, cy, CELL_SIZE / 2 - 2, 0, Math.PI * 2); ctx.fill();
    }

    // Snake
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const isHead = i === 0;
      ctx.fillStyle = isHead ? '#73d13d' : '#52c41a';
      ctx.beginPath();
      ctx.roundRect(
        seg.x * CELL_SIZE + (isHead ? 1 : 2),
        seg.y * CELL_SIZE + (isHead ? 1 : 2),
        CELL_SIZE - (isHead ? 2 : 4),
        CELL_SIZE - (isHead ? 2 : 4),
        isHead ? 6 : 4,
      );
      ctx.fill();
    }

    // Overlays
    if (st === 'idle') drawOverlay('🐍 贪吃蛇', '点击「开始」或按 空格键');
    else if (st === 'paused') drawOverlay('⏸ 已暂停');
    else if (st === 'over') drawOverlay('游戏结束', `得分: ${g.current.score}`, '#ff4d4f');
  }

  function drawOverlay(title: string, subtitle?: string, color = '#fff') {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(title, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 8);
    if (subtitle) {
      ctx.fillStyle = subtitle === `得分: ${g.current.score}` ? '#fff' : '#aaa';
      ctx.font = '16px sans-serif';
      ctx.fillText(subtitle, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 28);
    }
  }

  // ---- Game loop ----
  function tick() {
    const dir = g.current.nextDirection;
    g.current.direction = dir;
    const vec = DIR_VEC[dir];
    const head = g.current.snake[0];
    const newHead: Point = { x: head.x + vec.x, y: head.y + vec.y };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      triggerGameOver();
      return;
    }

    // Self collision (skip tail unless eating)
    const willEat = g.current.food
      && newHead.x === g.current.food.x
      && newHead.y === g.current.food.y;
    const body = willEat ? g.current.snake : g.current.snake.slice(0, -1);
    for (const s of body) {
      if (s.x === newHead.x && s.y === newHead.y) { triggerGameOver(); return; }
    }

    // Move
    g.current.snake = [newHead, ...g.current.snake];
    if (willEat) {
      g.current.score += 1;
      setScore(g.current.score);
      g.current.food = randomFood(g.current.snake);
      g.current.speed = Math.max(MIN_SPEED, INITIAL_SPEED - g.current.score * SPEED_INCREASE);
    } else {
      g.current.snake.pop();
    }
  }

  function gameLoop(ts: number) {
    if (g.current.status === 'running') {
      if (ts - g.current.lastTick >= g.current.speed) {
        g.current.lastTick = ts;
        tick();
      }
    }
    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }

  // ---- Controls ----
  function startGame() { initGame('running'); }
  function resetGame() { initGame('idle'); }

  function togglePause() {
    if (g.current.status === 'running') {
      syncUI('paused', g.current.score);
    } else if (g.current.status === 'paused') {
      g.current.status = 'running';
      g.current.lastTick = performance.now();
      setStatus('running');
    }
  }

  // ---- Keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        w: 'UP',
        W: 'UP',
        s: 'DOWN',
        S: 'DOWN',
        a: 'LEFT',
        A: 'LEFT',
        d: 'RIGHT',
        D: 'RIGHT',
      };
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        if (dir !== OPPOSITE[g.current.direction] && g.current.status === 'running') g.current.nextDirection = dir;
      }
      if (e.key === ' ') {
        e.preventDefault();
        if (g.current.status === 'idle' || g.current.status === 'over') startGame();
        else togglePause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // 游戏状态存于 useRef，回调读取 ref 无需依赖变化；startGame/togglePause 有意不纳入依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Start loop ----
  useEffect(() => {
    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
    // gameLoop 通过 ref 读取最新状态，仅在挂载时启动一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============ Render ============
  return (
    <div className="snake-game-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>🐍 贪吃蛇</h2>
        <Space>
          {status === 'running' && (
            <Button icon={<PauseCircleOutlined />} onClick={togglePause}>暂停</Button>
          )}
          {(status === 'idle' || status === 'paused') && (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={startGame}>开始</Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={resetGame}>重置</Button>
        </Space>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <Space size={40}>
          <Statistic
            title="当前得分"
            value={score}
            prefix={<TrophyOutlined />}
            valueStyle={{ color: '#52c41a', fontWeight: 700 }}
          />
          <Statistic
            title="最高纪录"
            value={highScore}
            prefix="🏆"
            valueStyle={{ color: '#faad14', fontWeight: 700 }}
          />
        </Space>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Card
          styles={{ body: { padding: 0, lineHeight: 0 } }}
          style={{ display: 'inline-block', borderRadius: 8, overflow: 'hidden' }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ display: 'block' }}
          />
        </Card>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16, color: '#999', fontSize: 13 }}>
        🎮 方向键 / WASD 控制方向 · 空格键 开始/暂停
      </div>
    </div>
  );
}

export default SnakeGame;

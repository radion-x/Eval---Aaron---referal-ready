import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext'; // Adjusted path

interface PlasmaBackgroundProps {
  isDashboard?: boolean;
}

const PlasmaBackground: React.FC<PlasmaBackgroundProps> = ({ isDashboard }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef({ x: -1000, y: -1000 });
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number = window.innerWidth;
    let height: number = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    let animationFrameId: number;

    const spines: Spine[] = [];
    const arcs: Arc[] = [];
    const numberOfSpines = 6;
    const vertebraeCount = 32;
    const spineLayers = 2;

    interface Node {
      baseY: number;
      phase: number;
      radius: number;
      x: number; 
      y: number; 
    }

    interface Spine {
      baseX: number;
      depth: number;
      colorBase: number; // Hue for dark, lightness offset for light
      offset: number;
      nodes: Node[];
    }
    
    interface Arc {
        x1: number; y1: number;
        x2: number; y2: number;
        hue: number; // Hue for dark, fixed for light (gray)
        life: number;
        opacity: number;
        lineWidth: number;
    }
    
    const activeNodes: { x: number; y: number; hue: number; proximity: number }[] = [];

    function lerp(a: number, b: number, t: number): number {
      return a + (b - a) * t;
    }

    function initializeSpines() {
        spines.length = 0; 
        for (let l = 0; l < spineLayers; l++) {
            for (let i = 0; i < numberOfSpines; i++) {
                const spineBaseX = (i + 0.5) * (width / numberOfSpines);
                const spine: Spine = {
                    baseX: spineBaseX,
                    depth: l === 0 ? 1 : 0.4,
                    colorBase: theme === 'dark' ? 180 + Math.random() * 80 : Math.random() * 50 + 20, // Hue for dark, Lightness base for light (20-70)
                    offset: Math.random() * Math.PI * 2,
                    nodes: []
                };
                for (let j = 0; j < vertebraeCount; j++) {
                    const baseY = ((j + 1) / (vertebraeCount + 1)) * height;
                    spine.nodes.push({
                        baseY: baseY,
                        phase: Math.random() * Math.PI * 2,
                        radius: 5 + Math.random() * 2,
                        x: spineBaseX, 
                        y: baseY      
                    });
                }
                spines.push(spine);
            }
        }
    }

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initializeSpines(); 
    };

    const handleMouseMove = (e: globalThis.MouseEvent) => {
        mousePosRef.current.x = e.clientX;
        mousePosRef.current.y = e.clientY;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    
    initializeSpines(); 

    let frame = 0;

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = theme === 'dark' ? "lighter" : "source-over"; // Lighter for dark, normal for light
      frame += 0.01;

      activeNodes.length = 0;

      for (const spine of spines) {
        let prev: { x: number; y: number } | null = null;
        for (let i = 0; i < spine.nodes.length; i++) {
          const node = spine.nodes[i];
          const baseY = node.baseY;

          const angle = frame + i * 0.25 + spine.offset + node.phase;
          const sway = Math.sin(angle) * 20 * spine.depth;
          const waveY = baseY + Math.cos(angle * 0.6) * 10 * spine.depth;

          const spineDist = Math.abs(spine.baseX - mousePosRef.current.x);
          const bendFactor = Math.max(0, 1 - spineDist / 250);
          const curveInfluence = Math.sin((baseY - mousePosRef.current.y) / 60) * bendFactor * 30;

          const targetX = spine.baseX + sway + curveInfluence;
          const targetY = waveY;

          node.x = lerp(node.x, targetX, 0.08); 
          node.y = lerp(node.y, targetY, 0.08); 

          const dx = node.x - mousePosRef.current.x;
          const dy = node.y - mousePosRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const proximity = Math.max(0, 1 - dist / 100);
          const glow = theme === 'dark' ? (0.6 + proximity * 1.4 * spine.depth) : (0.3 + proximity * 0.7 * spine.depth);
          const size = node.radius + proximity * 3;

          let hue, saturation, lightness, alpha;

          if (theme === 'dark') {
            hue = (spine.colorBase + i * 3 + frame * 40) % 360;
            saturation = 100;
            lightness = 80; // Node center lightness
            alpha = glow;
          } else { // Light theme - monochrome (grays)
            hue = 0; // Hue is irrelevant for grayscale
            saturation = 0; // Grayscale
            lightness = spine.colorBase + i * 0.5 + Math.sin(frame*2 + spine.offset + i*0.1) * 5; // Varying lightness 20-70 + variation
            lightness = Math.max(10, Math.min(80, lightness)); // Clamp lightness
            alpha = glow * 0.5 + 0.1; // Softer glow for light theme
          }

          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 4);
          gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
          gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${Math.max(0, lightness-40)}%, 0)`);


          ctx.beginPath();
          ctx.fillStyle = gradient;
          ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
          ctx.fill();

          if (prev) {
            ctx.beginPath();
            const lineAlpha = theme === 'dark' ? (0.08 + proximity * 0.2) : (0.05 + proximity * 0.1);
            const lineLightness = theme === 'dark' ? 60 : 50;
            ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lineLightness}%, ${lineAlpha})`;
            ctx.lineWidth = 1.2 * spine.depth;
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(node.x, node.y);
            ctx.stroke();
          }

          prev = { x: node.x, y: node.y };
          activeNodes.push({ x: node.x, y: node.y, hue: theme === 'dark' ? hue : 0, proximity });
        }
      }

      activeNodes.forEach(from => {
        if (from.proximity > 0.4 && Math.random() < 0.25) {
          const to = activeNodes[Math.floor(Math.random() * activeNodes.length)];
          if (to) { 
            arcs.push({
              x1: from.x, y1: from.y, x2: to.x, y2: to.y,
              hue: from.hue, life: 15 + Math.random() * 10,
              opacity: theme === 'dark' ? (0.3 + Math.random() * 0.4) : (0.2 + Math.random() * 0.3), 
              lineWidth: 1 + Math.random() * 1.5
            });
          }
        }
      });

      if (Math.random() < 0.1 && activeNodes.length > 0) {
        const from = activeNodes[Math.floor(Math.random() * activeNodes.length)];
        const to = activeNodes[Math.floor(Math.random() * activeNodes.length)];
        if (from && to) { 
            arcs.push({
                x1: from.x, y1: from.y, x2: to.x, y2: to.y,
                hue: from.hue, life: 30, 
                opacity: theme === 'dark' ? 0.15 : 0.1, 
                lineWidth: 0.8
            });
        }
      }

      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i];
        arc.life--;
        if (arc.life <= 0) {
          arcs.splice(i, 1);
        } else {
          ctx.beginPath();
          const arcLightness = theme === 'dark' ? 75 : 60;
          const arcSaturation = theme === 'dark' ? 100 : 0;
          ctx.strokeStyle = `hsla(${arc.hue}, ${arcSaturation}%, ${arcLightness}%, ${(arc.life / 40) * arc.opacity})`;
          ctx.lineWidth = arc.lineWidth;
          ctx.moveTo(arc.x1, arc.y1);
          ctx.lineTo(arc.x2, arc.y2);
          ctx.stroke();
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    draw(); // Initial draw

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]); // Re-run effect if theme changes to re-initialize spines with new color scheme

  const overlayBackground = theme === 'dark' 
    ? 'radial-gradient(circle at center, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.85))'
    : 'radial-gradient(circle at center, rgba(255, 255, 255, 0.1), rgba(220, 220, 230, 0.4))';


  return (
    <>
      <canvas 
        ref={canvasRef} 
        id="canvas" 
        style={{ 
          display: 'block', 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          zIndex: 0, 
        }} 
      />
      {!isDashboard && (
        <div 
          className="plasma-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            background: overlayBackground, 
            zIndex: 1, 
          }}
        />
      )}
    </>
  );
};

export default PlasmaBackground;

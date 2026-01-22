import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
  Audio,
  AbsoluteFill,
  Sequence,
} from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/PressStart2P";

// Load Press Start 2P pixel font
const { fontFamily: pixelFont } = loadFont();

// ============================================
// ARKAGENTIC BRAND COLORS (from th3ark.com)
// ============================================
const COLORS = {
  bgDarkest: "#0D1B33",
  bgDark: "#0F2140",
  bgMedium: "#132850",
  bgBorder: "#1E3A5F",
  accent: "#e94560",
  accentGlow: "#e9456080",
  textPrimary: "#F8E8BE",
  textSecondary: "#D4C9A8",
  textMuted: "#A89F7F",
};

const FONT_PIXEL = pixelFont;

// ============================================
// AGENT DATA WITH SPRITE MAPPING
// ============================================
const AGENTS = [
  { name: "Scout", role: "Research Specialist", sprite: "archie", spriteWidth: 16 },
  { name: "Sage", role: "Strategic Analyst", sprite: "steven", spriteWidth: 16 },
  { name: "Chronicle", role: "Newsroom Editor", sprite: "birch", spriteWidth: 16 },
  { name: "Trends", role: "Intelligence Analyst", sprite: "maxie", spriteWidth: 16 },
  { name: "Maven", role: "General Assistant", sprite: "may", spriteWidth: 14 },
  { name: "Gandalfius", role: "Freelancing Wizard", sprite: "joseph", spriteWidth: 16 },
];

// ============================================
// ANIMATED WALKING SPRITE COMPONENT
// ============================================
interface WalkingSpriteProps {
  sprite: string;
  spriteWidth?: number;
  scale?: number;
  direction?: number; // 0=down, 1=left, 2=right, 3=up
}

const WalkingSprite: React.FC<WalkingSpriteProps> = ({
  sprite,
  spriteWidth = 16,
  scale = 6,
  direction = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // 3 frames per walk cycle, animate at ~6fps for retro feel
  const walkFrame = Math.floor((frame / (fps / 6)) % 3);
  const scaledWidth = spriteWidth * scale;
  const scaledHeight = 20 * scale; // sprites are 20px tall
  const totalSheetWidth = spriteWidth * 12 * scale; // 12 frames total
  
  // Calculate background position for walking animation
  // Sprite sheet: 4 directions x 3 frames = 12 frames horizontal
  // direction * 3 frames + current walk frame
  const frameIndex = direction * 3 + walkFrame;
  const xOffset = -frameIndex * scaledWidth;
  
  return (
    <div
      style={{
        width: scaledWidth,
        height: scaledHeight,
        backgroundImage: `url(${staticFile(`sprites/${sprite}.png`)})`,
        backgroundSize: `${totalSheetWidth}px ${scaledHeight}px`,
        backgroundPosition: `${xOffset}px 0`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
    />
  );
};

// ============================================
// TYPEWRITER TEXT COMPONENT
// ============================================
interface TypewriterTextProps {
  text: string;
  startFrame?: number;
  charsPerFrame?: number;
  style?: React.CSSProperties;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame = 0,
  charsPerFrame = 0.5,
  style,
}) => {
  const frame = useCurrentFrame();
  const charsToShow = Math.floor((frame - startFrame) * charsPerFrame);
  const displayText = text.slice(0, Math.max(0, charsToShow));
  
  return (
    <span style={style}>
      {displayText}
      {charsToShow < text.length && charsToShow > 0 && (
        <span style={{ opacity: frame % 10 < 5 ? 1 : 0 }}>_</span>
      )}
    </span>
  );
};

// ============================================
// GLITCH TEXT COMPONENT
// ============================================
interface GlitchTextProps {
  text: string;
  intensity?: number;
  style?: React.CSSProperties;
}

const GlitchText: React.FC<GlitchTextProps> = ({ text, intensity = 1, style }) => {
  const frame = useCurrentFrame();
  const glitchActive = frame % 30 < 3;
  const offsetX = glitchActive ? (Math.random() - 0.5) * 10 * intensity : 0;
  const offsetY = glitchActive ? (Math.random() - 0.5) * 5 * intensity : 0;
  
  return (
    <div style={{ position: "relative", ...style }}>
      {/* Red layer */}
      {glitchActive && (
        <span
          style={{
            position: "absolute",
            left: -3 * intensity,
            color: "#ff0000",
            opacity: 0.7,
            clipPath: "inset(10% 0 60% 0)",
          }}
        >
          {text}
        </span>
      )}
      {/* Cyan layer */}
      {glitchActive && (
        <span
          style={{
            position: "absolute",
            left: 3 * intensity,
            color: "#00ffff",
            opacity: 0.7,
            clipPath: "inset(50% 0 20% 0)",
          }}
        >
          {text}
        </span>
      )}
      {/* Main text */}
      <span style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}>
        {text}
      </span>
    </div>
  );
};

// ============================================
// ANIMATED PARTICLES BACKGROUND
// ============================================
const ParticlesBackground: React.FC<{ count?: number }> = ({ count = 30 }) => {
  const frame = useCurrentFrame();
  
  // Generate stable random positions
  const particles = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (i * 137.5) % 100,
      y: (i * 73.7) % 100,
      size: 2 + (i % 3),
      speed: 0.3 + (i % 5) * 0.1,
      delay: i * 10,
    }));
  }, [count]);
  
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {particles.map((p, i) => {
        const y = (p.y + frame * p.speed * 0.3) % 120 - 10;
        const opacity = interpolate(Math.sin((frame + p.delay) * 0.05), [-1, 1], [0.1, 0.4]);
        
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: COLORS.accent,
              opacity,
              boxShadow: `0 0 ${p.size * 2}px ${COLORS.accent}`,
            }}
          />
        );
      })}
    </div>
  );
};

// ============================================
// SCANLINES OVERLAY
// ============================================
const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.08 }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 0, 0, ${opacity}) 2px,
          rgba(0, 0, 0, ${opacity}) 4px
        )`,
      }}
    />
  );
};

// ============================================
// SCENE 1: HOOK - PROVOCATIVE QUESTION
// ============================================
const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Hook question (0-60 frames)
  const hookOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const hookScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  
  // Phase 2: Zoom out, reveal logo (60-120 frames)
  const revealStart = 70;
  const logoOpacity = interpolate(frame, [revealStart, revealStart + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoScale = spring({
    frame: Math.max(0, frame - revealStart),
    fps,
    config: { damping: 15, stiffness: 80 },
  });
  
  // Title appears
  const titleOpacity = interpolate(frame, [100, 115], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  // Glow pulse
  const glowIntensity = interpolate(Math.sin(frame * 0.1), [-1, 1], [20, 50]);

  return (
    <AbsoluteFill style={{ background: COLORS.bgDarkest }}>
      <ParticlesBackground count={40} />
      <Scanlines />
      
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontFamily: FONT_PIXEL,
        }}
      >
        {/* Hook Question - BIG AND BOLD */}
        <div
          style={{
            opacity: hookOpacity,
            transform: `scale(${interpolate(hookScale, [0, 1], [0.9, 1])})`,
            textAlign: "center",
            marginBottom: frame > revealStart ? 40 : 0,
          }}
        >
          <h1
            style={{
              fontSize: frame > revealStart ? 48 : 72,
              fontWeight: 700,
              color: COLORS.textPrimary,
              margin: 0,
              lineHeight: 1.3,
              textShadow: `0 0 30px ${COLORS.accentGlow}`,
              transition: "font-size 0.3s",
            }}
          >
            <TypewriterText
              text="Tired of boring meetings?"
              startFrame={5}
              charsPerFrame={0.8}
            />
          </h1>
        </div>

        {/* Logo Reveal */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${interpolate(logoScale, [0, 1], [0.5, 1])})`,
            filter: `drop-shadow(0 0 ${glowIntensity}px ${COLORS.accentGlow})`,
          }}
        >
          <Img
            src={staticFile("ark-logo.png")}
            style={{ width: 400, height: "auto" }}
          />
        </div>

        {/* Title */}
        <div style={{ opacity: titleOpacity, marginTop: 30 }}>
          <GlitchText
            text="ArkAgentic"
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: COLORS.accent,
              textShadow: `0 0 20px ${COLORS.accent}`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 2: MEETING ROOMS - THE BIG REVEAL
// ============================================
const MeetingRoomsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const strikethrough = interpolate(frame, [10, 40], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const revealOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const revealScale = spring({
    frame: Math.max(0, frame - 50),
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  const glowPulse = interpolate(Math.sin(frame * 0.15), [-1, 1], [10, 50]);

  const features = [
    "Walk around freely",
    "Chat with AI agents",
    "Multiplayer fun",
  ];

  return (
    <AbsoluteFill style={{ background: COLORS.bgDarkest }}>
      <ParticlesBackground count={25} />
      <Scanlines />
      
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontFamily: FONT_PIXEL,
          padding: 60,
        }}
      >
        {/* Boring meetings - strikethrough */}
        <div style={{ position: "relative", marginBottom: 60 }}>
          <h2
            style={{
              fontSize: 56,
              color: COLORS.textMuted,
              margin: 0,
            }}
          >
            Boring Zoom Calls
          </h2>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              height: 8,
              width: `${strikethrough}%`,
              background: COLORS.accent,
              transform: "translateY(-50%) rotate(-2deg)",
              boxShadow: `0 0 20px ${COLORS.accent}`,
            }}
          />
        </div>

        {/* MEETING ROOMS reveal */}
        <div
          style={{
            opacity: revealOpacity,
            transform: `scale(${interpolate(revealScale, [0, 1], [0.8, 1])})`,
          }}
        >
          <div
            style={{
              background: COLORS.accent,
              padding: "40px 80px",
              borderRadius: 12,
              boxShadow: `0 0 ${glowPulse}px ${COLORS.accent}, 0 0 ${glowPulse * 2}px ${COLORS.accentGlow}`,
            }}
          >
            <h1
              style={{
                fontSize: 80,
                fontWeight: 800,
                color: COLORS.bgDarkest,
                margin: 0,
                letterSpacing: 4,
              }}
            >
              MEETING ROOMS
            </h1>
          </div>
        </div>

        {/* Feature pills */}
        <div
          style={{
            marginTop: 60,
            display: "flex",
            gap: 30,
          }}
        >
          {features.map((feature, index) => {
            const delay = 90 + index * 15;
            const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const y = interpolate(frame, [delay, delay + 15], [30, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={feature}
                style={{
                  opacity,
                  transform: `translateY(${y}px)`,
                  background: COLORS.bgMedium,
                  border: `3px solid ${COLORS.accent}`,
                  borderRadius: 8,
                  padding: "20px 40px",
                }}
              >
                <span style={{ fontSize: 28, color: COLORS.textPrimary, fontWeight: 600 }}>
                  {feature}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 3: GAMEPLAY SCREENSHOTS
// ============================================
const GameplayScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const screenshots = [
    "screenshots/05-current.png",
    "screenshots/07-inside-room.png",
    "screenshots/09-exploring.png",
  ];

  const cycleDuration = fps * 2.5;
  const activeIndex = Math.floor((frame / cycleDuration) % screenshots.length);
  const borderGlow = interpolate(Math.sin(frame * 0.1), [-1, 1], [15, 40]);

  return (
    <AbsoluteFill style={{ background: COLORS.bgDarkest }}>
      <Scanlines opacity={0.05} />
      
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontFamily: FONT_PIXEL,
          padding: 40,
        }}
      >
        <h2
          style={{
            fontSize: 56,
            color: COLORS.textPrimary,
            marginBottom: 40,
            textShadow: `0 0 20px ${COLORS.accentGlow}`,
          }}
        >
          Explore the <span style={{ color: COLORS.accent }}>AgentVerse</span>
        </h2>
        
        <div
          style={{
            position: "relative",
            width: 1500,
            height: 750,
            borderRadius: 12,
            overflow: "hidden",
            border: `4px solid ${COLORS.accent}`,
            boxShadow: `0 0 ${borderGlow}px ${COLORS.accent}, inset 0 0 ${borderGlow}px ${COLORS.accentGlow}`,
          }}
        >
          {screenshots.map((src, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={src}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: isActive ? 1 : 0,
                  transition: "opacity 0.3s",
                }}
              >
                <Img
                  src={staticFile(src)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 4: MEET YOUR AI AGENTS - WITH WALKING SPRITES!
// ============================================
const AgentsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: COLORS.bgDarkest }}>
      <ParticlesBackground count={20} />
      <Scanlines opacity={0.05} />
      
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100%",
          fontFamily: FONT_PIXEL,
          padding: "60px 80px",
        }}
      >
        <h2
          style={{
            fontSize: 64,
            color: COLORS.textPrimary,
            marginBottom: 50,
            opacity: titleOpacity,
            textShadow: `0 0 20px ${COLORS.accentGlow}`,
          }}
        >
          Meet Your <span style={{ color: COLORS.accent }}>AI Agents</span>
        </h2>

        {/* Agent Grid - 3x2 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 40,
            width: "100%",
            maxWidth: 1600,
          }}
        >
          {AGENTS.map((agent, index) => {
            const delay = 30 + index * 12;
            const cardOpacity = interpolate(frame, [delay, delay + 15], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const cardScale = spring({
              frame: Math.max(0, frame - delay),
              fps,
              config: { damping: 12, stiffness: 100 },
            });
            const cardY = interpolate(frame, [delay, delay + 15], [40, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={agent.name}
                style={{
                  opacity: cardOpacity,
                  transform: `scale(${interpolate(cardScale, [0, 1], [0.9, 1])}) translateY(${cardY}px)`,
                  background: `linear-gradient(135deg, ${COLORS.bgDark} 0%, ${COLORS.bgMedium} 100%)`,
                  border: `3px solid ${COLORS.accent}`,
                  borderRadius: 16,
                  padding: "30px 40px",
                  display: "flex",
                  alignItems: "center",
                  gap: 30,
                  boxShadow: `0 0 20px ${COLORS.accentGlow}`,
                }}
              >
                {/* Walking Sprite */}
                <div
                  style={{
                    background: COLORS.bgDarkest,
                    borderRadius: 12,
                    padding: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <WalkingSprite
                    sprite={agent.sprite}
                    spriteWidth={agent.spriteWidth}
                    scale={5}
                    direction={0}
                  />
                </div>

                {/* Agent Info */}
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontSize: 36,
                      color: COLORS.accent,
                      margin: 0,
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    {agent.name}
                  </h3>
                  <p
                    style={{
                      fontSize: 22,
                      color: COLORS.textPrimary,
                      margin: 0,
                    }}
                  >
                    {agent.role}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 5: CTA - JOIN NOW
// ============================================
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textOpacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const buttonOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const buttonScale = spring({
    frame: Math.max(0, frame - 50),
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  const glowIntensity = interpolate(Math.sin(frame * 0.15), [-1, 1], [20, 50]);

  return (
    <AbsoluteFill style={{ background: COLORS.bgDarkest }}>
      <ParticlesBackground count={50} />
      <Scanlines opacity={0.05} />
      
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontFamily: FONT_PIXEL,
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: logoOpacity,
            filter: `drop-shadow(0 0 30px ${COLORS.accentGlow})`,
            marginBottom: 40,
          }}
        >
          <Img
            src={staticFile("ark-logo.png")}
            style={{ width: 350, height: "auto" }}
          />
        </div>

        {/* Headline */}
        <div style={{ opacity: textOpacity, textAlign: "center", marginBottom: 30 }}>
          <h1
            style={{
              fontSize: 72,
              color: COLORS.textPrimary,
              margin: 0,
              textShadow: `0 0 30px ${COLORS.accentGlow}`,
            }}
          >
            Join the <span style={{ color: COLORS.accent }}>Adventure</span>
          </h1>
          <p
            style={{
              fontSize: 32,
              color: COLORS.textMuted,
              marginTop: 20,
            }}
          >
            No more boring meetings. Just fun.
          </p>
        </div>

        {/* CTA Button */}
        <div
          style={{
            opacity: buttonOpacity,
            transform: `scale(${interpolate(buttonScale, [0, 1], [0.8, 1])})`,
          }}
        >
          <div
            style={{
              background: COLORS.accent,
              padding: "30px 80px",
              borderRadius: 12,
              boxShadow: `0 0 ${glowIntensity}px ${COLORS.accent}, 0 0 ${glowIntensity * 2}px ${COLORS.accentGlow}`,
            }}
          >
            <span
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: COLORS.bgDarkest,
              }}
            >
              agentic.th3ark.com
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// MAIN DEMO VIDEO COMPOSITION
// ============================================
export const DemoVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <>
      {/* Background Music */}
      <Audio src={staticFile("music/background.mp3")} volume={0.5} />

      <TransitionSeries>
        {/* Scene 1: Hook + Logo Intro (5 seconds) */}
        <TransitionSeries.Sequence durationInFrames={fps * 5}>
          <IntroScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />

        {/* Scene 2: Meeting Rooms Reveal (7 seconds) */}
        <TransitionSeries.Sequence durationInFrames={fps * 7}>
          <MeetingRoomsScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />

        {/* Scene 3: Gameplay Screenshots (7 seconds) */}
        <TransitionSeries.Sequence durationInFrames={fps * 7}>
          <GameplayScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />

        {/* Scene 4: AI Agents with Walking Sprites (8 seconds) */}
        <TransitionSeries.Sequence durationInFrames={fps * 8}>
          <AgentsScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />

        {/* Scene 5: CTA (5 seconds) */}
        <TransitionSeries.Sequence durationInFrames={fps * 5}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </>
  );
};

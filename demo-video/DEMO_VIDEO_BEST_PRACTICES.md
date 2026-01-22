# Demo Video Best Practices for Coding Agents

> Reusable concepts and patterns from the ArkAgentic demo video. Use these principles to create compelling demo videos for any AI/coding agent product.

---

## The Golden Rule: First 5 Seconds Decide Everything

Studies show viewers decide whether to keep watching within the first 5 seconds. Don't waste this time on logo fades or slow intros.

---

## 1. The Hook (First 5 Seconds)

### Pattern: Provocative Question + Visual Surprise

**Don't do this:**
```
[Logo fades in slowly]
[Company name appears]
[Tagline fades in]
```

**Do this instead:**
```
[Big bold text types out]: "Tired of boring meetings?"
[Pause for impact]
[Logo reveals with glitch effect]
[Product name with energy]
```

### Hook Templates for Coding Agents

| Agent Type | Hook Question |
|------------|---------------|
| Code Assistant | "Still copy-pasting from Stack Overflow?" |
| Code Review | "How many bugs slipped into production this week?" |
| Documentation | "When did you last update your docs?" |
| Testing Agent | "Writing tests manually? In 2025?" |
| DevOps Agent | "Another 3am deployment fire?" |
| Research Agent | "Tired of reading 47 tabs to find one answer?" |
| Debugging Agent | "How long did your last bug hunt take?" |
| Refactoring Agent | "Legacy code giving you nightmares?" |

### Hook Techniques (Choose One)

1. **Problem Statement** - State the pain point directly
   - "Meetings are broken."
   - "Code reviews take forever."

2. **Provocative Question** - Make them think
   - "What if your AI could actually code?"
   - "Still debugging manually?"

3. **Statistic** - Use a shocking number
   - "Developers spend 75% of time NOT coding."
   - "The average bug costs $10,000 to fix in production."

4. **Visual Surprise** - Unexpected animation or reveal
   - Glitch effects
   - Rapid text animation
   - Screen "breaking" effect

5. **Contrast** - Old way vs new way
   - Strikethrough the old method
   - Reveal the better alternative

---

## 2. The Strikethrough Reveal

One of the most effective patterns for showing transformation.

### Structure
```
[Show the OLD/BAD way - slightly muted text]
[Animated strikethrough crosses it out - RED for impact]
[Pause]
[Reveal the NEW/GOOD way - BIG, BOLD, GLOWING]
```

### Examples

| Old Way (Strikethrough) | New Way (Reveal) |
|------------------------|------------------|
| "Boring Zoom Calls" | "MEETING ROOMS" |
| "Manual Code Review" | "AI-POWERED REVIEW" |
| "Copy-Paste Coding" | "INTELLIGENT AGENTS" |
| "Reading Documentation" | "ASK YOUR CODEBASE" |
| "Writing Boilerplate" | "GENERATE & GO" |

### Animation Timing
- Old text: Fade in (0-20 frames)
- Strikethrough: Animate across (25-55 frames) 
- Pause: Let it sink in (55-70 frames)
- New reveal: Spring animation with glow (70-100 frames)

---

## 3. Feature Presentation

### Pattern: Pills/Tags with Staggered Animation

Don't list features in boring bullet points. Use animated "pills" that pop in one by one.

```
[Feature 1 pops up from bottom]
  [15 frame delay]
[Feature 2 pops up from bottom]
  [15 frame delay]
[Feature 3 pops up from bottom]
```

### Keep Features Short
- 3-4 words maximum per pill
- Action-oriented language
- Benefit-focused, not feature-focused

| Bad (Feature) | Good (Benefit) |
|---------------|----------------|
| "GPT-4 Integration" | "Understands your code" |
| "Multi-file support" | "Works across projects" |
| "API access" | "Connects to everything" |
| "Real-time sync" | "Always up to date" |

---

## 4. Character/Agent Showcase

### Pattern: Walking Sprites with Info Cards

If your product has multiple agents/personas/modes, showcase each one:

```
[Grid layout - 2x3 or 3x2]
[Each card animates in with stagger]
[Character sprite + Name + Role]
[Spring animation for "bounce" effect]
```

### Card Animation Sequence
1. Card scales from 0.9 to 1.0
2. Card translates from +40px to 0
3. Opacity fades from 0 to 1
4. Each card delays 12-15 frames from previous

### Agent Card Template
```
+------------------+
| [Sprite/Icon]    |
|                  |
| Agent Name       | <- Large, accent color
| Role/Specialty   | <- Smaller, muted
+------------------+
```

---

## 5. The CTA (Call to Action)

### Pattern: Logo + Headline + Glowing Button

```
[Logo fades in with glow]
[Headline: "Join the Adventure" / "Start Building"]
[Subtext: Single benefit statement]
[URL/Button with pulsing glow effect]
```

### CTA Headlines by Product Type

| Product Type | CTA Headline |
|--------------|--------------|
| Fun/Game | "Join the Adventure" |
| Productivity | "Start Shipping Faster" |
| Developer Tool | "Build Something Amazing" |
| Enterprise | "Transform Your Workflow" |
| Open Source | "Join the Community" |

### CTA Subtext Formula
"No more [PAIN POINT]. Just [BENEFIT]."

Examples:
- "No more boring meetings. Just fun."
- "No more copy-paste. Just build."
- "No more context switching. Just flow."
- "No more manual reviews. Just ship."

---

## 6. Visual Effects Library

### Must-Have Effects

#### Typewriter Text
- Characters appear one by one
- Blinking cursor at end
- ~0.5-0.8 characters per frame
- Creates anticipation

#### Glitch Effect
- RGB split (red/cyan offset)
- Random position jitter
- Trigger every ~30 frames for 3 frames
- Use on important reveals

#### Particle Background
- 20-40 floating particles
- Slow upward drift
- Accent color with glow
- Low opacity (0.1-0.4)

#### Scanlines
- Horizontal lines overlay
- Very low opacity (0.05-0.08)
- Creates retro/tech feel
- Works great for dev tools

#### Pulsing Glow
- Use on CTAs and key reveals
- Sine wave interpolation
- Range: 15-50px blur
- Accent color

---

## 7. Timing Guidelines

### Scene Durations
| Scene Type | Duration | Frames @30fps |
|------------|----------|---------------|
| Hook | 3-5 seconds | 90-150 |
| Feature Reveal | 5-7 seconds | 150-210 |
| Demo/Screenshots | 6-8 seconds | 180-240 |
| Agent Showcase | 6-8 seconds | 180-240 |
| CTA | 4-5 seconds | 120-150 |

### Total Video Length
- **Ideal**: 30-45 seconds
- **Maximum**: 60 seconds
- **Social Media**: 15-30 seconds

### Transition Timing
- Fade transitions: 12-15 frames
- Slide transitions: 15-20 frames
- Use spring timing for energy

---

## 8. Color Palette

### Dark Mode (Recommended for Dev Tools)

```
Background:     #0D1B33 (dark blue) or #0a0a0f (near black)
Surface:        #0F2140 or #14141e
Border:         #1E3A5F or #2a2a3e
Accent:         #e94560 (red) or #00ff88 (green) or #6366f1 (purple)
Text Primary:   #F8E8BE (cream) or #ffffff
Text Muted:     #A89F7F or #888888
```

### Accent Color by Product Vibe
| Vibe | Accent Color |
|------|--------------|
| Fun/Playful | Red #e94560 |
| Professional | Blue #3b82f6 |
| Growth/Success | Green #00ff88 |
| Creative | Purple #6366f1 |
| Energy | Orange #f97316 |

---

## 9. Typography

### Font Choices

| Style | Font | Use Case |
|-------|------|----------|
| Pixel/Retro | Press Start 2P | Game-like products |
| Modern | Inter, Geist | SaaS/Enterprise |
| Technical | JetBrains Mono | Developer tools |
| Friendly | Nunito, Poppins | Consumer products |

### Size Guidelines (1920x1080)
- Hook text: 64-80px
- Headlines: 48-64px
- Body/Features: 28-36px
- Labels/Roles: 18-24px

---

## 10. Music

### Characteristics
- Upbeat but not distracting
- Loop-friendly (for any length)
- No vocals (competes with text)
- Match the product vibe

### Volume
- 40-50% of max
- Should enhance, not overpower
- Consider ducking during key moments

### Sources
- Suno AI (generate custom)
- Epidemic Sound
- Artlist
- YouTube Audio Library (free)

---

## 11. Technical Setup (Remotion)

### Recommended Config
```typescript
// Root.tsx
<Composition
  id="DemoVideo"
  component={DemoVideo}
  durationInFrames={30 * 34}  // Calculate exactly!
  fps={30}
  width={1920}
  height={1080}
/>
```

### Reusable Components to Build
1. `TypewriterText` - Animated text reveal
2. `GlitchText` - RGB split effect
3. `ParticlesBackground` - Floating particles
4. `Scanlines` - CRT overlay
5. `WalkingSprite` - Animated character
6. `FeaturePill` - Animated tag/badge
7. `GlowButton` - Pulsing CTA

### Render Command
```bash
npx remotion render DemoVideo out/demo.mp4
```

---

## 12. Quick Checklist

Before rendering, verify:

- [ ] Hook grabs attention in first 5 seconds
- [ ] No slow logo fade intro
- [ ] Text is large enough (test on mobile)
- [ ] Strikethrough/reveal pattern for transformation
- [ ] Features are benefit-focused, not feature-focused
- [ ] Each agent/mode gets visual representation
- [ ] CTA has clear action + glowing emphasis
- [ ] Video is under 45 seconds
- [ ] Music volume is balanced (40-50%)
- [ ] Composition duration matches scene total
- [ ] No empty frames at end

---

## 13. Template: 30-Second Demo Video

```
SCENE 1: HOOK (5s)
├── Typewriter: "[Provocative Question]?"
├── Pause for impact
├── Logo reveal with glow
└── Product name with glitch

SCENE 2: TRANSFORMATION (6s)  
├── Old way (muted text)
├── Strikethrough animation (RED)
├── New way reveal (BIG + GLOW)
└── 3 feature pills pop in

SCENE 3: SHOWCASE (8s)
├── Title: "Meet Your [Agents/Features]"
└── 4-6 cards animate in grid
    └── Icon + Name + Description

SCENE 4: DEMO (6s)
├── Title: "See it in action"
└── Screenshots/GIF carousel

SCENE 5: CTA (5s)
├── Logo with glow
├── Headline: "[Action Statement]"
├── Subtext: "No more [pain]. Just [benefit]."
└── URL/Button with pulse glow
```

---

## Example: Adapting for a Code Review Agent

```
HOOK: "How many bugs slipped into production this week?"

STRIKETHROUGH: "Manual Code Review" → "AI-POWERED REVIEW"

FEATURES:
- "Catches bugs instantly"
- "Learns your codebase"  
- "Reviews in seconds"

AGENTS:
- SecurityBot: "Finds vulnerabilities"
- StyleGuard: "Enforces standards"
- PerfAnalyzer: "Spots bottlenecks"

CTA: "Start Shipping Confidently"
Subtext: "No more missed bugs. Just clean code."
```

---

*Created from the ArkAgentic demo video project. Feel free to adapt these patterns for your own AI/coding agent demos!*

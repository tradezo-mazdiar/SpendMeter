# SpendMeter — Brand & Style Guide (V1)

Version: 1.0  
Theme: Dark Only  
Tone: Minimal • Disciplined • Analytical • Premium  

This document defines the **visual identity and UI rules** for SpendMeter.  
Cursor must treat this as the single source of truth for design decisions.

---

# 1. Brand Personality

SpendMeter is a **financial control room**, not a playful budgeting app.

Core Traits:
- Calm
- Structured
- Focused
- Disciplined
- Clean

Not:
- Neon fintech
- Crypto-styled
- Gamified
- Loud
- Over-animated

Emotional Goal:
> When users open SpendMeter, they feel in control.

---

# 2. Color System (Dark Theme Only)

## 2.1 Background Colors

| Usage | Name | Hex |
|-------|------|------|
| App Background | Deep Charcoal | #0E1117 |
| Card Background | Soft Graphite | #161B22 |
| Elevated Surface | Slate | #1C2128 |
| Subtle Border | Border Soft | #2A2F36 |

Never use pure black.

---

## 2.2 Primary Accent

Electric Teal: #00C2A8

Used for:
- Primary buttons
- Active navigation state
- Positive remaining amount
- Active toggles
- Links

Do not use gradients.

---

## 2.3 Danger / Over Budget

Soft Signal Red: #FF4D4F

Used only for:
- Over budget state
- Negative remaining amount
- Destructive buttons

---

## 2.4 Attention / Banner

Muted Amber: #F5A524

Used for:
- “New Month Detected” banner
- Important notifications

---

## 2.5 Text Colors

| Usage | Hex |
|-------|------|
| Primary Text | #E6EDF3 |
| Secondary Text | #9DA7B3 |
| Muted Text | #6B7280 |

Never use pure white text.

---

# 3. Typography

Primary Font: Inter (or system sans-serif fallback)

Font Weights:
- Page Titles: 600
- Section Titles: 500
- Amounts: 600
- Body Text: 400
- Secondary Text: 400

Amounts must be visually strong but not oversized.

No text shadows.
No glow effects.

---

# 4. Spending Bar Rules

Normal State:
- Track: #1C2128
- Fill: #00C2A8

Over Budget:
- Fill: #FF4D4F

Rules:
- No percentage text.
- No gradient fills.
- Smooth transitions only.

---

# 5. Component Styling Rules

## Cards
- Rounded-xl
- Soft shadow only
- Clear separation from background
- Padding: generous

## Buttons

Primary:
- Background: #00C2A8
- Text: Dark
- Subtle hover state

Secondary:
- Outline style
- Border: #2A2F36

Danger:
- #FF4D4F background

---

# 6. Layout Philosophy

- Mobile-first
- Generous spacing
- No cramped UI
- Bottom navigation for main sections
- Floating “Add” button

---

# 7. Motion

- 150–200ms transitions
- No bounce animations
- No flashy effects
- Smooth and subtle only

---

# 8. Iconography

Library: lucide-react

Rules:
- Outline style
- Thin stroke
- No filled icons
- Minimal use

---

# 9. UI Restrictions

The following are NOT allowed in V1:

- No percentage usage display
- No light theme toggle
- No gradients
- No neon colors
- No glassmorphism
- No heavy shadows
- No flashy micro-animations

---

# 10. Design Intent Summary

SpendMeter should feel:

- Professional
- Calm
- Analytical
- Controlled

If unsure about a design decision:
Choose the more minimal and disciplined option.

---

END OF STYLE GUIDE\n
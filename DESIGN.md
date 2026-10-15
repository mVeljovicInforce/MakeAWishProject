# Hidden Wishes — Design Specification

## 1. Product Vision

Hidden Wishes should feel less like a social network and more like finding anonymous notes left by strangers in a quiet room.

The experience should be intimate, calm, human, and slightly mysterious.

Visitors should be able to:

- read something honest from a person they may never meet
- leave something of their own without creating an identity
- quietly react when a wish touches them
- leave without feeling watched, ranked, judged, or pressured to stay

The product should avoid mechanics that create competition, popularity pressure, or negative feedback loops.

No profiles.  
No follower counts.  
No visible popularity metrics.  
No public reaction counts.  
No comments.  
No arguments.

The site should feel like a place people visit for a moment, leave something sincere behind, and continue with their day.

---

## 2. Core Emotional Principle

Hidden Wishes is not a content platform.

A wish is not a post.

A reaction is not a like.

The design should reinforce the idea that each wish is a small piece of someone’s inner life.

The site should communicate:

> You can leave something here without having to explain yourself.

---

## 3. Site Structure

The first public version should contain four primary experiences:

```text
/
Landing page

/wishes
Explore anonymous wishes

/make-a-wish
Write and release a wish

/about
About Hidden Wishes
```

The architecture should remain simple.

No frontend framework is required unless there is a strong technical reason to introduce one.

---

## 4. Global Navigation

Navigation should be minimal and visually quiet.

Suggested desktop layout:

```text
Hidden Wishes                           Explore    Leave a Wish
```

`Hidden Wishes` acts as the home link.

`About` may live primarily in the footer instead of the main navigation.

On mobile, avoid adding a hamburger menu unless necessary. With only a small number of links, a compact header is preferred.

Navigation must never dominate the page.

---

## 5. Landing Page `/`

### 5.1 Purpose

The landing page should create an emotional connection before explaining features.

It should not immediately resemble a form, feed, dashboard, or conventional application.

The first screen should feel almost empty.

Whitespace is part of the design.

### 5.2 Hero

Suggested structure:

```text
Hidden Wishes


What do you wish for
when nobody is listening?


"I wish my dad knew I still hear his voice
whenever I don't know what to do."


Read another wish


Explore wishes      Leave a wish
```

The exact line breaks may change depending on screen size.

### 5.3 First Featured Wish

The first wish shown to a new visitor is manually selected and stored as the single wish flagged `is_featured` in the database (see `REQUIREMENT.md` FR-012). There is no admin UI yet.

It should be:

- intimate
- sincere
- emotionally strong
- simple
- natural rather than overly literary
- believable as something a real person might anonymously write late at night

The featured wish is responsible for establishing the emotional tone of the entire product.

Example tone:

> I wish my dad knew I still hear his voice whenever I don't know what to do.

The featured wish should not contain reaction UI.

It should stand alone.

Later, when enough real reactions exist, the landing page may optionally select a wish based on internal reaction data.

Public popularity must still not be displayed.

### 5.4 Wish Rotation

The featured wish may change through one of two interactions:

#### Manual
A visitor clicks:

**Read another wish**

After the initial featured wish, this loads a random wish from the normal wish collection, excluding the currently displayed wish where practical. There is no separate curated pool.

#### Optional slow rotation
A new wish may appear automatically after approximately 8–10 seconds.

If automatic rotation is implemented:

- the interval must be slow
- text must never disappear before a visitor has reasonable time to read it
- interaction with the wish should pause the timer
- reduced-motion accessibility preferences must be respected

Manual control should always remain available.

### 5.5 Below the Hero

After the visitor scrolls, explain the idea in very little text.

Suggested copy:

> No profiles.  
> No likes to chase.  
> No followers.  
> Just something you wanted to say.

Then:

> Leave something here.

With a CTA:

**Leave a wish**

Avoid long marketing sections.

### 5.6 Background Atmosphere

The landing page may use very slow, subtle background movement.

Possible visual elements:

- soft blurred light
- extremely faint gradients
- barely visible dust or glow
- slow-moving background shapes

Do not use obvious particle systems, starfields, galaxy imagery, or gaming-style effects.

The visitor should feel the atmosphere before consciously noticing the effect.

---

## 6. Explore Wishes `/wishes`

### 6.1 Purpose

This page allows visitors to encounter anonymous wishes from other people.

It should not look like a social-media feed.

### 6.2 Wish Layout

Avoid a rigid list of identical cards.

Preferred feel:

- loose grid
- gentle masonry-like arrangement
- varied whitespace
- wishes of different lengths naturally creating different visual sizes

Each wish remains visually simple.

Example:

```text
I hope my dog lives forever.

                         I want to stop checking
                         my phone hoping it's you.

I wish I called
my dad more often.
```

The implementation does not need a complex masonry library.

CSS Grid or another simple native approach is preferred.

### 6.3 Wish Card Content

A wish may contain:

- wish text
- subtle relative time
- shooting-star reaction control

It should not contain:

- username
- avatar
- public reaction count
- comments
- share count
- ranking
- score
- badges

### 6.4 Loading More Wishes

The page should provide a clear way to discover another group.

Suggested label:

**Show me different wishes**

The page initially shows 6 random wishes, and the control loads another set of 6. The existing random-wish API powers this behavior (`count=6`).

An infinite feed is not required.

The product should not intentionally encourage endless scrolling.

---

## 7. Shooting Star Reaction

### 7.1 Product Meaning

Hidden Wishes should support exactly one supportive reaction type.

It is not called a like.

It represents:

> This touched me.

or, through interaction copy:

> Send a little light.

The purpose is to let a stranger quietly acknowledge another person's wish without judging it.

### 7.2 Visual Design

The reaction control should appear as a small shooting-star icon near the lower-right area of a wish.

The icon should consist of:

- a small star
- a short curved or diagonal trail
- a few tiny points of “star dust”

The default state should be subtle.

It may have an extremely soft occasional shimmer, but should not continuously flash or distract from the wish.

### 7.3 Hover / Focus

When a mouse or keyboard user focuses the star:

- glow increases slightly
- trail becomes slightly more visible
- accessible text appears or is available to assistive technology

Suggested microcopy:

**Send a little light**

Alternative:

**This touched me**

Preferred product wording:

**Send a little light**

### 7.4 Activation Animation

When clicked or activated with the keyboard:

1. The star brightens gently.
2. A short trail of star dust moves behind it.
3. A few tiny particles fade out.
4. The icon settles into a softly illuminated active state.

The full effect should last roughly 500–900 ms.

It should feel rewarding but quiet.

No explosive particles.  
No confetti.  
No sound.  
No bouncing animation.

### 7.5 Reaction Rules

- A visitor may react once to a particular wish.
- The public UI must never display the number of reactions.
- Reaction totals are stored internally.
- Reaction data may later help determine featured wishes.
- A reaction should not change the ordering of wishes immediately in a way that exposes popularity.
- A visitor should not be encouraged to react to every wish.

For this version, the browser generates a random anonymous identifier stored in `localStorage` and sends it with the reaction; the backend stores only a hash of it, in a separate `wish_reactions` table, solely to prevent duplicate reactions to the same wish. The browser may also remember reacted wish IDs for UI state. See `REQUIREMENT.md` FR-010.

A more robust server-side strategy may be introduced before a larger public launch.

### 7.6 Accessibility

The shooting star must be a real interactive control.

It must:

- be keyboard accessible
- have a visible focus state
- include an accessible label
- not require hover to understand its purpose
- respect `prefers-reduced-motion`

Suggested accessible label:

`Send a little light to this wish`

---

## 8. Make a Wish `/make-a-wish`

### 8.1 Purpose

Writing a wish should feel like a small ritual rather than filling out a web form.

The page should contain very little visual noise.

### 8.2 Main Copy

Suggested title:

> Leave something here.

Suggested supporting copy:

> You don't need to explain it.

### 8.3 Input

Use a large textarea.

Suggested placeholder:

> I wish...

Requirements already defined in `REQUIREMENT.md` remain applicable:

- maximum 500 characters
- whitespace trimmed
- empty wishes rejected
- safe rendering
- frontend and backend validation

The textarea should feel integrated into the page rather than like a generic form component.

### 8.4 Character Counter

Display a quiet counter near the input.

Example:

```text
84 / 500
```

It should not visually compete with the wish itself.

### 8.5 Submission CTA

Do not use generic wording such as:

**Submit**

Preferred label:

**Release my wish**

This reinforces the emotional concept of leaving something behind.

### 8.6 Successful Submission

After a wish is accepted, the form should gently transition away.

Suggested primary response:

> It's out there now.

Supporting text:

> Somewhere, someone may read it.

Then provide:

**Read someone else's wish**

and optionally:

**Leave another**

The success state should not immediately push the user to create more content.

---

## 9. About `/about`

The About page should be short and human.

Suggested content:

> Hidden Wishes is a place for things we don't always say out loud.

> Maybe it's something small.  
> Maybe it's something you've carried for years.

> You don't need an account.  
> You don't need to tell us who you are.

> Leave a wish. Read someone else's. Then keep going.

Privacy note:

> We don't ask for your name, email, or profile.

Avoid:

- corporate mission statements
- founder biographies in the first version
- marketing claims
- long legal explanations on this page

---

## 10. Visual Identity

### 10.1 General Style

Keywords:

- intimate
- quiet
- nocturnal
- warm
- minimal
- human
- mysterious
- elegant

Avoid:

- corporate SaaS styling
- neon cyberpunk
- obvious galaxy themes
- excessive glassmorphism
- social-media card layouts
- bright gamification

### 10.2 Color Direction

Suggested direction rather than strict final values:

**Background**  
Very deep navy, charcoal, or blue-black.

**Primary text**  
Warm off-white rather than pure white.

**Secondary text**  
Soft muted gray.

**Accent**  
Muted violet, soft blue, or warm starlight tone.

**Shooting star**  
A restrained pale glow.

The final implementation may tune exact values visually.

Hidden Wishes v2 is **dark by default**. The visual identity does not switch between light and dark based on the operating system preference.

---

## 11. Typography

Use typography to distinguish human thoughts from interface controls.

### Wish text

Prefer a readable serif or humanistic display font.

Characteristics:

- intimate
- literary without looking formal
- excellent readability
- graceful quotation appearance

### Interface text

Use a clean sans-serif.

Examples:

- navigation
- buttons
- timestamps
- helper text
- character count

This distinction should subtly communicate:

**wish = person**  
**UI = application**

Avoid excessive font weights and sizes.

For now, use only system fonts: a good system serif stack for wish text and a system sans-serif stack for interface text. Do not add Google Fonts or other external font dependencies.

---

## 12. Motion Design

Motion should be subtle and meaningful.

Preferred animations:

- opacity fade
- 6–12 px vertical movement
- slow glow
- shooting-star trail
- gentle crossfade between wishes

Avoid:

- bounce
- spring-heavy motion
- spinning
- fast zoom
- large parallax
- unnecessary page transition effects

All non-essential animation must respect:

```css
@media (prefers-reduced-motion: reduce)
```

---

## 13. Tone of Voice

The product should speak softly.

Copy should be:

- short
- sincere
- simple
- emotionally intelligent
- never overly motivational
- never corporate

Prefer:

> Leave something here.

Instead of:

> Share your anonymous thoughts with our community.

Prefer:

> It's out there now.

Instead of:

> Your submission has been successfully processed.

Prefer:

> Read another wish.

Instead of:

> Load more content.

---

## 14. Mobile Experience

Mobile should not feel like a reduced desktop version.

Priorities:

- generous side padding
- comfortable line lengths
- large touch targets
- readable wish typography
- textarea large enough for emotional writing
- reaction control easy to tap
- no horizontal scrolling

On small screens, wish layouts may collapse into a single column.

The atmospheric whitespace should remain.

Do not pack the screen simply because space is limited.

---

## 14a. Unknown Routes

Unknown website routes show a simple custom 404 page in the same quiet visual style, with calm copy and a link back home.

---

## 15. Empty States

If no wishes exist:

> No wishes are here yet.

Then:

> You could leave the first one.

CTA:

**Leave a wish**

Avoid technical empty-state language.

---

## 16. Error States

Errors should remain calm and human.

Preferred:

> Something went wrong. Please try again.

For submission:

> Your wish couldn't be released just now. Please try again.

Do not expose technical details in the UI.

---

## 17. What Hidden Wishes Must Not Become

Do not introduce the following without an explicit product decision:

- public like counts
- reaction counts
- comments
- replies
- public usernames
- avatars
- follower systems
- popularity badges
- trending sections
- leaderboards
- streaks
- notifications designed to increase engagement
- infinite scroll intended to maximize session time
- competitive gamification
- public ranking of wishes

The site should never imply that one person's wish matters more because more people interacted with it.

---

## 18. Featured Wish Strategy

### Phase 1

Use a manually selected featured wish on the landing page, stored via an `is_featured` flag (one active featured wish, enforced by application logic).

This allows the product to establish its tone before enough organic reaction data exists.

### Phase 2 (deferred — not part of v2)

Once meaningful usage exists, reaction data may help identify wishes that resonated strongly with visitors.

Possible internal selection logic:

- minimum age before eligibility
- minimum number of reactions
- exclude recently featured wishes
- avoid repeatedly showing the same wish
- allow manual override

The public UI should never display:

- “most liked”
- “top wish”
- reaction count
- ranking position

The visitor should simply encounter the wish.

---

## 19. Relationship to REQUIREMENT.md

`REQUIREMENT.md` is the source of truth for required system behavior. The shooting-star reaction, featured wish, routes, and 404 page are now defined there (FR-010 – FR-012, FR-011).

This document defines:

- visual direction
- interaction design
- tone
- page structure
- product philosophy

If this document describes functionality not yet present in `REQUIREMENT.md`, that functionality should be added to the requirements before implementation.

In particular, the shooting-star reaction system should receive its own functional requirement before Claude or another coding agent implements it.

---

## 20. Implementation Principle

When implementing this design:

- preserve the existing working backend where possible
- prefer native browser functionality
- avoid unnecessary dependencies
- avoid frontend frameworks unless clearly justified
- keep animations lightweight
- maintain accessibility
- preserve anonymity
- prefer emotional clarity over feature quantity

The visual design may evolve.

The product principle should not:

> A quiet place where a stranger can leave a wish, and another stranger can send it a little light.

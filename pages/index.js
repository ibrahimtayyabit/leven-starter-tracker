import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

// ─── Mode / Step data ────────────────────────────────────────────────────────
const MODES = {
  refresh: {
    label: 'Starter Refresh',
    steps: [
      { title: 'Transfer 20g to clean jar', desc: 'Take out 20g of your starter into a clean container (mason jar ideal). Glass, plastic, or stainless steel only.', amounts: ['20g starter out'], checkWindow: null },
      { title: 'First feed — 20g water + 20g flour', desc: 'Add 20g filtered water and 20g unbleached flour (bread flour preferred). Stir well, mark the line with a rubber band or tape. Leave at 70–75°F.', amounts: ['20g water', '20g flour', '= 60g total'], checkWindow: [4, 6] },
      { title: 'Second feed — NO discard — 60g water + 60g flour', desc: 'Do NOT discard this time. Add 60g water and 60g flour directly to the jar. Stir well and remark the line at the new level.', amounts: ['60g water', '60g flour'], checkWindow: [4, 8] },
      { title: 'Check for 1.5× rise', desc: 'Look for at least 1.5× rise from your marked line after 4–8 hours. Bubbles and a dome are great signs. If active — refresh complete!', amounts: [], checkWindow: [4, 8] },
      { title: 'No activity? Emergency feed', desc: 'Discard half, feed 1:1:1 ratio, stir in ½–1 tsp sugar. Wait 4–8 more hours. Still nothing? Contact Sarver Farms — free replacement!', amounts: ['Discard half', '= starter weight of water', '= starter weight of flour', '½–1 tsp sugar'], checkWindow: [4, 8], optional: true },
    ]
  },
  counter: {
    label: 'Counter / Daily Feeding',
    steps: [
      { title: 'Discard half your starter', desc: 'Remove half. Save in a fridge bowl for discard recipes (use within a week) or toss. Keeping a discard stash is great for crackers, pancakes, etc.', amounts: [], checkWindow: null },
      { title: 'Feed 1:1:1 — equal water + flour to remaining', desc: 'Add equal weight of water then flour to what remains. Example: 50g left → 50g water + 50g flour = 150g total. Stir well and mark the new level.', amounts: ['1:1:1 ratio', '= 3× remaining weight'], checkWindow: [4, 8] },
      { title: 'Watch for 2–3× rise', desc: 'Ready to bake in 4–8 hours at 75–80°F. Ready when risen 2–3× from your marked line. Warmer = faster, cooler = slower.', amounts: [], checkWindow: [4, 8] },
    ]
  },
  fridge: {
    label: 'Fridge Storage',
    steps: [
      { title: 'Feed 1:1:1 then refrigerate immediately', desc: 'Feed first (discard half, add equal water + flour). Put in fridge immediately after — do not wait for rise.', amounts: ['1:1:1 ratio'], checkWindow: null },
      { title: 'Check every few days', desc: 'Lasts 1–2 weeks without feeding. If you see liquid (hooch) on top, stir in or pour off — it\'s safe. Feed soon when you see hooch.', amounts: [], checkWindow: [48, 96] },
      { title: 'Revive: discard half + warm to room temp', desc: 'Pour off any liquid, discard half, leave at room temp 2–4 hours before feeding.', amounts: [], checkWindow: [2, 4] },
      { title: 'Feed 1:1:1 and watch for 2× rise', desc: 'Feed equal water + flour. Let sit 4–12 hours. Ready when 2× risen. Feed again before returning to fridge if storing long-term.', amounts: ['1:1:1 ratio'], checkWindow: [4, 12] },
    ]
  },
  longterm: {
    label: 'Long-Term Dry Storage',
    steps: [
      { title: 'Feed starter normally first', desc: 'Feed using 1:1:1 method. Let become active (bubbly, rising) before drying — this ensures viable yeast cells.', amounts: ['1:1:1 ratio'], checkWindow: [4, 8] },
      { title: 'Spread thin — air dry 1–3 days', desc: 'Spread thinly on parchment or silicone mat. Air dry 1–3 days at room temp. Dehydrator is fine — stay below 85–90°F or you\'ll kill the yeast.', amounts: [], checkWindow: [24, 72] },
      { title: 'Store chips — 1+ year shelf life', desc: 'Break into chips. Store in brown paper bag or sealed plastic bag with silica gel packet. Cool, dark, dry place. Shelf stable 1+ year.', amounts: [], checkWindow: null },
    ]
  },
}

const MODE_ICONS = { refresh: '🔄', counter: '🍞', fridge: '❄️', longterm: '📦' }
const OBS_LABELS = { rising: 'Rising 📈', peaked: 'Peaked 🏔️', falling: 'Falling 📉', 'no-double': 'Didn\'t double 😕', 'no-activity': 'No activity 😴', liquid: 'Liquid on top 💧', ready: 'Ready to bake! 🎉' }

// ─── Recipe data ─────────────────────────────────────────────────────────────
const RECIPE_SECTIONS = [
  {
    id: 'beginner',
    label: 'Start Here — Bread Basics',
    recipes: [
      {
        id: 'clever-carrot', icon: '⭐', featured: true,
        title: "Sourdough Bread — A Beginner's Guide",
        meta: 'by Emilie Raffa · The Clever Carrot · 1 loaf · ~14 hours total',
        note: 'Absolute best starting point. Clearest instructions, great base recipe — easily add herbs, cheese, or jalapeños once you\'ve got it down.',
        stats: [['Prep','13 hrs'],['Bake','1 hr'],['Total','14 hrs'],['Yield','1 loaf']],
        body: `
<div class="r-note">Uses olive oil as a signature addition — creates a light, plush crumb and a crisp golden crust. Requires a 5½–6 qt Dutch oven.</div>
<div class="r-sub">Ingredients</div>
<ul class="r-ing">
<li>150g bubbly, active sourdough starter</li>
<li>250g warm water (up to 300–325g for a softer, stretchier dough)</li>
<li>25g olive oil</li>
<li>500g bread flour (not all-purpose flour)</li>
<li>10g fine sea salt</li>
<li>Fine ground cornmeal or parchment paper, for Dutch oven</li>
</ul>
<div class="r-sub">Instructions</div>
<ol class="r-steps">
<li><strong>Make the dough:</strong> Mix starter, water, and olive oil. Add flour and salt. Mix until stiff, then squish together by hand until all flour is incorporated. Dough will be rough and shaggy.</li>
<li><strong>Autolyse rest:</strong> Cover with plastic wrap or a damp towel and rest 30 min to 1 hour.</li>
<li>After resting, work dough into a rough ball (about 15 seconds).</li>
<li><strong>Bulk rise (first rise):</strong> Cover and let rise in a warm place (70–75°F) until nearly doubled. Summer ~2–4 hrs at 80°F; winter ~10–12 hrs at 68°F. Watch the dough, not the clock.</li>
<li><strong>Optional stretch &amp; fold:</strong> Do 1–2 sets spaced ~1 hour apart during the bulk rise. Lift a section of dough, stretch up, fold over. Rotate and repeat all around. This strengthens the gluten.</li>
<li><strong>Shape:</strong> Turn onto lightly floured surface. Fold top to center, turn slightly, fold next section. Repeat all around. Flip seam-side down and rotate in circles to create tension.</li>
<li><strong>Second rise:</strong> Line Dutch oven with parchment. Place dough seam-side down inside. Cover and let rise 30 min–1 hour until slightly puffy (not doubled). Preheat oven to 450°F.</li>
<li><strong>Score:</strong> Just before baking, make a shallow 2–3" slash with a lame, razor blade, or sharp knife.</li>
<li><strong>Bake:</strong> Place covered Dutch oven on center rack. Reduce temp to 400°F. Bake 20 min covered, remove lid, bake another 40 min until deep golden brown. Internal temp: 205–210°F.</li>
<li>Cool on a wire rack for at least 1 hour before slicing. Stays fresh 3 days at room temp in an airtight bag or container.</li>
</ol>
<div class="r-tip">For a more open crumb: try shaping a batard (oval loaf) and doing a cold proof in the fridge for at least 24 hours before baking. The longer cold ferment dramatically improves texture.</div>`
      },
      {
        id: 'bread-formula', icon: '📐', featured: false,
        title: 'Sourdough Bread Formula',
        meta: 'by Jarkko Laine · Bread Magazine · reference formula',
        note: 'The master formula most sourdough bakers use. Once you understand this, you can adapt any bread recipe.',
        stats: [],
        body: `
<div class="r-note">Before baking your first loaf, test your starter: drop a spoonful into cool water. If it floats, it\'s ready. If it sinks, give it more time. At its peak it should be foamy with bubbles of different sizes and smell pleasantly sour.</div>
<div class="r-sub">Master Formula (per 1kg flour)</div>
<div class="r-formula">
<span class="pct">85%</span> bread or all-purpose flour — <strong>850g</strong><br>
<span class="pct">15%</span> wholemeal wheat flour — <strong>150g</strong><br>
<span class="pct">70%</span> water — <strong>700g</strong><br>
<span class="pct">25%</span> young, ripe sourdough starter — <strong>250g</strong><br>
<span class="pct">2%</span> salt — <strong>20g</strong>
</div>
<div class="r-sub">Instructions</div>
<ol class="r-steps">
<li><strong>Prepare starter 8–10 hrs before mixing:</strong> Take 1 tbsp of starter into a clean bowl. Add 150g flour + 150g water. Cover and leave at room temp overnight — you'll have ~300g young, ripe starter in the morning.</li>
<li><strong>Mix dough:</strong> Combine all ingredients except salt until no dry lumps remain. Cover and rest 30 min.</li>
<li>After 30 min, add salt and fold in until fully incorporated.</li>
<li><strong>Strengthen the dough:</strong> Every 30 min for ~4 hours, grab a corner, stretch it over the top, press down. Repeat around the dough until it feels airy and passes the windowpane stretch test.</li>
<li><strong>Shape</strong> into one or two round loaves. Place in banneton baskets or lined bowls.</li>
<li><strong>Final rise:</strong> Proof in the fridge overnight, or at room temp for 2–4 hours.</li>
<li><strong>Bake:</strong> Dutch oven at 230°C / 446°F. Covered 25 min (steam for oven spring). Uncovered 20–25 min more for a deep golden crust.</li>
</ol>
<div class="r-tip">The actual hydration is ~73% (not 70%) once you account for the flour and water inside the starter itself. This matters when troubleshooting — a 73% dough is wetter and stickier than a 70% one.</div>`
      },
      {
        id: 'one-formula', icon: '🧮', featured: false,
        title: 'One Formula to Rule Them All',
        meta: 'by Jarkko Laine · Bread Magazine · baking concepts',
        note: "Understand baker's percentages and you'll never need to follow a recipe again.",
        stats: [],
        body: `
<div class="r-sub">The Concept</div>
<p style="font-size:.8rem;line-height:1.7;margin-bottom:.8rem;">Every bread recipe boils down to four ingredients: flour, water, salt, and leaven. Baker's percentages express every ingredient as a proportion of the total flour weight — so <strong>70% water</strong> means 700g of water per 1000g of flour.</p>
<div class="r-formula">
<span class="pct">100%</span> flour — <strong>1000g</strong><br>
<span class="pct">70%</span> water — <strong>700g</strong><br>
<span class="pct">2%</span> salt — <strong>20g</strong><br>
<span class="pct">~25%</span> sourdough starter — <strong>250g</strong>
</div>
<div class="r-sub">Hydration Guide</div>
<ol class="r-steps">
<li><strong>Low hydration (60–65%):</strong> Stiffer dough, easier to shape, denser crumb. Good for beginners.</li>
<li><strong>Medium hydration (70–75%):</strong> Standard artisan loaf. Chewy, open crumb. Where most recipes live.</li>
<li><strong>High hydration (80%+):</strong> Open crumb, ciabatta-style. Sticky, harder to shape. More experienced bakers.</li>
<li>To scale any recipe: decide your flour weight first, then multiply by each percentage. 500g flour at 70% hydration = 350g water (500 × 0.7).</li>
</ol>
<div class="r-tip">Once 70% hydration and 2% salt become second nature, you can bake any loaf from memory. You'll find yourself saying things like "I made an 80% hydration loaf with 20% whole wheat today."</div>`
      },
    ]
  },
  {
    id: 'general',
    label: 'General · Beginner Friendly · ♻ Discard Welcome',
    recipes: [
      {
        id: 'pancakes', icon: '🥞', featured: false,
        title: 'Classic Sourdough Pancakes ♻',
        meta: 'King Arthur Baking · ~2 dozen pancakes · overnight + 42 min',
        note: null,
        stats: [['Overnight','12 hrs'],['Prep','42 min'],['Yield','~24 pancakes']],
        body: `
<div class="r-sub">Overnight Sponge</div>
<ul class="r-ing">
<li>227g (1 cup) sourdough starter, unfed/discard</li>
<li>454g (2 cups) buttermilk</li>
<li>240g (2 cups) all-purpose flour</li>
<li>28g (2 tbsp) granulated sugar</li>
</ul>
<div class="r-sub">Batter (add in the morning)</div>
<ul class="r-ing">
<li>All of the overnight sponge</li>
<li>2 large eggs</li>
<li>50g (¼ cup) vegetable oil or 57g (4 tbsp) butter, melted</li>
<li>1 tsp baking soda</li>
<li>¾ tsp table salt</li>
</ul>
<div class="r-sub">Instructions</div>
<ol class="r-steps">
<li>The night before: stir together starter, buttermilk, flour, and sugar in a large bowl. Cover and rest at room temp (65–70°F) for about 12 hours overnight.</li>
<li>In the morning: beat eggs and oil/butter together. Add to the overnight sponge and stir just to combine.</li>
<li>Add baking soda and salt — the batter will expand and bubble a bit.</li>
<li>Pour ¼ cup of batter per pancake onto a preheated, lightly greased griddle. Cook until bubbles form and pop on top, then flip and cook until browned underneath.</li>
<li>Serve immediately with your favorite toppings, or keep warm in a 200°F oven.</li>
<li>Store leftover pancakes refrigerated for 1–2 days or freeze for longer storage.</li>
</ol>
<div class="r-tip">Gluten-free? Substitute King Arthur Gluten-Free Measure for Measure Flour for the all-purpose flour — no other changes needed. Note that GF pancakes cook more slowly than standard.</div>`
      },
      {
        id: 'crackers', icon: '🫙', featured: false,
        title: 'Sourdough Crackers with Olive Oil & Herbs ♻',
        meta: 'Love and Olive Oil · ~16 servings · 1 hour total',
        note: 'Try substituting everything bagel seasoning for the herbs de Provence — equally fantastic!',
        stats: [['Rest','30 min'],['Bake','15 min'],['Total','1 hour']],
        body: `
<ul class="r-ing">
<li>200g (1 cup) mature sourdough starter, 100% hydration</li>
<li>60g (½ cup) all-purpose flour</li>
<li>60g (½ cup) whole wheat flour</li>
<li>12g (2 tbsp) rye flour</li>
<li>32g (3 tbsp) extra virgin olive oil</li>
<li>1 tbsp dried herbs de Provence (or everything bagel seasoning!)</li>
<li>½ tsp fine sea salt</li>
<li>Maldon flake salt, for topping</li>
</ul>
<div class="r-sub">Instructions</div>
<ol class="r-steps">
<li>Combine all ingredients in a bowl and knead until the dough comes together in a smooth ball.</li>
<li>Wrap tightly in plastic wrap and refrigerate at least 30 minutes (up to 24 hours).</li>
<li>Position oven racks in upper and lower thirds; preheat to 350°F. Line two baking sheets with parchment or silicone mats.</li>
<li>Cut dough in half; keep one half in the fridge while you work with the other. Cut each half into 4 smaller pieces.</li>
<li>Roll each piece as thin as possible into an oblong rectangle on a lightly floured surface. A pasta roller at setting #6 (of 8) gives ideal thin crackers. If rolling by hand, go as thin as you can.</li>
<li>Lay two oblongs side by side (not overlapping) on each baking sheet.</li>
<li>Spritz or brush lightly with water; sprinkle with flake salt.</li>
<li>Bake 12–15 minutes, rotating pans top-to-bottom and front-to-back halfway through, until lightly golden brown and crispy.</li>
<li>Let cool on a wire rack. Repeat with remaining dough. Store airtight at room temp up to 1 week.</li>
</ol>
<div class="r-tip">Any flour blend works as long as the total flour weight stays 132g. No rye flour? Just substitute 12g more whole wheat flour instead.</div>`
      },
      {
        id: 'biscuits', icon: '🧈', featured: false,
        title: 'Buttery Sourdough Sandwich Biscuits ♻',
        meta: 'King Arthur Baking · 6–7 large biscuits · 30 min total',
        note: null,
        stats: [['Prep','10 min'],['Bake','20–23 min'],['Temp','425°F']],
        body: `
<ul class="r-ing">
<li>120g (1 cup) all-purpose flour</li>
<li>2 tsp baking powder</li>
<li>¾ tsp table salt</li>
<li>113g (8 tbsp) unsalted butter, cold</li>
<li>227g (1 cup) sourdough starter, unfed/discard</li>
</ul>
<div class="r-sub">Instructions</div>
<ol class="r-steps">
<li>Preheat oven to 425°F with rack in the upper third. Grease a baking sheet or line with parchment.</li>
<li>Combine flour, baking powder, and salt. Work the cold butter into the flour mixture until unevenly crumbly — some pea-sized pieces are fine.</li>
<li>Add starter and mix gently until the dough is cohesive. Don't overwork it.</li>
<li>Turn dough onto a lightly floured surface and gently pat into a 6" round about 1" thick.</li>
<li>Cut 4 rounds with a 2⅜" biscuit cutter. Pat scraps into a 2½"×5" rectangle and cut 2 more biscuits. Pat remaining scraps into one final biscuit — it'll be slightly smaller.</li>
<li>Place on baking sheet about 2" apart — they spread as they bake.</li>
<li>Bake 20–23 minutes in the upper third of the oven until golden brown.</li>
<li>Serve warm. Or cool completely, wrap in plastic, and store at room temp for several days. Freeze for longer storage.</li>
</ol>
<div class="r-tip">For a subtle whole grain flavor: substitute 20g of rye or buckwheat flour for an equal amount of the all-purpose flour. If the dough seems very dry, dribble in a little milk or buttermilk until it comes together.</div>`
      },
      {
        id: 'pizza', icon: '🍕', featured: false,
        title: 'Sourdough Pizza Crust',
        meta: 'King Arthur Baking · four 10–12" pizzas · ~36 hrs total',
        note: null,
        stats: [['Prep','45 min'],['Bake','10–15 min'],['Total','~36 hrs'],['Yield','4 pizzas']],
        body: `
<div class="r-sub">Levain (build 3–4 hrs before mixing dough)</div>
<ul class="r-ing">
<li>50g ripe sourdough starter</li>
<li>100g King Arthur '00' Pizza Flour</li>
<li>100g water</li>
</ul>
<div class="r-sub">Dough</div>
<ul class="r-ing">
<li>275g warm water</li>
<li>15g (2½ tsp) table salt</li>
<li>200g levain from above</li>
<li>475g King Arthur '00' Pizza Flour</li>
<li>13g (scant 2 tbsp) medium rye flour</li>
<li>13g (scant 2 tbsp) whole wheat flour</li>
<li>Semolina flour for shaping (optional)</li>
</ul>
<div class="r-sub">Instructions</div>
<ol class="r-steps">
<li><strong>Build the levain:</strong> Combine levain ingredients in a tall jar. Cover at 72–75°F for 3–4 hours until doubled. Can refrigerate overnight (up to 12 hrs) — let sit at room temp 2 hours before using.</li>
<li><strong>Make the dough:</strong> Stir water and salt together until salt dissolves. Stir in 200g of the levain. Add all three flours and stir with a wooden spoon until no dry flour remains.</li>
<li>Cover and rest 10–15 minutes.</li>
<li><strong>Knead by hand</strong> using the slap-and-fold method until smooth and springy, ~10 minutes. Or <strong>stand mixer</strong> with dough hook on medium-low, ~10 minutes. Transfer to lightly greased bowl.</li>
<li><strong>Bulk ferment:</strong> Cover and rest until nearly doubled, about 4 hours.</li>
<li>Divide into 4 balls (225–235g each). Place on greased parchment-lined pan, cover well, refrigerate 24–48 hours.</li>
<li>About 2 hours before baking: remove dough from fridge, rest at room temp.</li>
<li>1 hour before baking: preheat oven to 500°F with a baking steel or stone in the top third.</li>
<li>Stretch each ball on a semolina-floured surface into a 10–12" round. Top with sauce, cheese, and toppings of your choice.</li>
<li>Transfer to hot steel/stone. Bake 10–15 min until crust is dark and cheese is bubbling. Cool briefly on a wire rack before slicing.</li>
</ol>
<div class="r-tip">Leftover dough you won't use today? Par-bake topped pizzas for 5 minutes, cool completely, wrap tightly, and freeze. Reheat from frozen in a 450°F oven.</div>`
      },
      {
        id: 'muffins', icon: '🫐', featured: false,
        title: 'Blueberry Sourdough Muffins ♻',
        meta: 'King Arthur Baking · 12 muffins · 35 min total',
        note: null,
        stats: [['Prep','15 min'],['Bake','14–18 min'],['Temp','425°F'],['Yield','12 muffins']],
        body: `
<ul class="r-ing">
<li>120g (1 cup) all-purpose flour</li>
<li>138g (1 cup) yellow cornmeal, preferably whole grain</li>
<li>¾ tsp table salt</li>
<li>1 tsp baking soda</li>
<li>1½ tsp cinnamon</li>
<li>227g (1 cup) sourdough starter, unfed/discard</li>
<li>57g (¼ cup) milk</li>
<li>1 large egg</li>
<li>57g (4 tbsp) melted butter or 50g (¼ cup) vegetable oil</li>
<li>156g (½ cup) maple syrup — or 170g molasses, or honey</li>
<li>340g (2 cups) blueberries, fresh or frozen</li>
<li>Demerara or coarse sparkling sugar, for sprinkling tops</li>
</ul>
<div class="r-sub">Instructions</div>
<ol class="r-steps">
<li>Preheat oven to 425°F. Grease wells of a 12-cup muffin pan, or line with baking cups and grease inside the cups.</li>
<li>In a mixing bowl, combine all dry ingredients (flour, cornmeal, salt, baking soda, cinnamon).</li>
<li>In a separate bowl, beat together starter, milk, egg, melted butter, and sweetener. Blend the wet ingredients into the dry, taking about 20 seconds. Gently stir in the blueberries just until blended.</li>
<li>Fill the cups of the prepared pan ⅔ full; sprinkle tops with sugar.</li>
<li>Bake 14–18 minutes until a toothpick inserted in the center comes out clean. Remove from oven and cool 5 minutes, then remove from pan. Don't let them cool in the pan — they'll steam and the outside will get tough.</li>
<li>Store at room temp in an airtight container for several days. Freeze for longer storage.</li>
</ol>
<div class="r-tip">Using fed starter instead of discard? Muffins will be slightly cakier and higher-rising. Using frozen blueberries? Don't thaw them — add frozen right before scooping to avoid blue streaks in the batter.</div>`
      },
      {
        id: 'cinnamon-rolls', icon: '🌀', featured: false,
        title: 'Sourdough Cinnamon Rolls',
        meta: 'King Arthur Baking · 1 dozen large rolls · 9.5 hrs total',
        note: null,
        stats: [['Prep','35 min'],['Bake','18–22 min'],['Total','9.5 hrs'],['Yield','12 rolls']],
        body: `
<div class="r-sub">Dough</div>
<ul class="r-ing">
<li>227g (1 cup) ripe (fed) sourdough starter</li>
<li>170g (¾ cup) milk, lukewarm</li>
<li>1 large egg</li>
<li>57g (4 tbsp) butter, softened</li>
<li>330g (2¾ cups) all-purpose flour</li>
<li>57g (½ cup) King Arthur Golden Wheat Flour (or sub all-purpose)</li>
<li>50g (¼ cup) granulated sugar</li>
<li>9g (1½ tsp) table salt</li>
<li>1 tsp instant yeast, optional (speeds up rising)</li>
</ul>
<div class="r-sub">Filling</div>
<ul class="r-ing">
<li>159g (¾ cup) light or dark brown sugar, packed</li>
<li>30g (¼ cup) all-purpose flour</li>
<li>1 tbsp cinnamon</li>
<li>⅛ tsp table salt</li>
<li>14g (1 tbsp) butter, melted</li>
</ul>
<div class="r-sub">Icing</div>
<ul class="r-ing">
<li>170g (1½ cups) confectioners' sugar</li>
<li>21g (1½ tbsp) butter</li>
<li>½ tsp vanilla extract</li>
<li>14–28g (1–2 tbsp) milk or heavy cream</li>
<li>Pinch of salt (optional)</li>
</ul>
<div class="r-sub">Instructions</div>
<ol class="r-steps">
<li><strong>Make the dough:</strong> Mix all dough ingredients except salt (and yeast) on low speed 2–3 min until cohesive. Add salt (and yeast) on top without mixing in. Cover and rest 20 min — this is the autolyse.</li>
<li>Mix in salt until incorporated, then knead on medium until smooth and supple but still slightly tacky, 2–3 minutes.</li>
<li><strong>First rise:</strong> Cover and rest at 75°F for 4 hours. Do 3–4 stretch and folds spaced ~1 hour apart. Dough should feel airy and elastic.</li>
<li><strong>Make the filling:</strong> Combine all filling ingredients — texture should be like wet sand.</li>
<li>Turn dough onto a lightly floured surface. Pat or roll into a 14"×20" rectangle.</li>
<li>Spread filling evenly over the dough, leaving ½" bare along one short edge.</li>
<li>Roll tightly from the filling-covered short edge into a log (~18" long). Slice into 12 pieces (1½" each). Place cut-side up in a lightly greased 9"×13" pan.</li>
<li>Cover and let rise until puffy, 2–3 hours. Or refrigerate overnight (up to 24 hours) for a next-day bake.</li>
<li><strong>Bake same day:</strong> Preheat to 400°F, bake 18–22 min until golden (190°F internal). <strong>After refrigerating:</strong> let rolls sit at room temp while oven preheats, then bake 20–25 min.</li>
<li><strong>Make icing:</strong> Stir together all icing ingredients until smooth. Ice the rolls after cooling 5–10 min.</li>
</ol>
<div class="r-tip">Using the optional yeast? First rise will take only 2–2½ hours with just 2–3 stretch and folds; second rise 1½–2 hours. No Golden Wheat flour? All-purpose works fine with no adjustments.</div>`
      },
    ]
  },
  {
    id: 'advanced',
    label: 'More Advanced — Higher Hydration',
    recipes: [
      {
        id: 'alexandra', icon: '🍞', featured: false,
        title: 'Homemade Sourdough Bread — Step by Step',
        meta: "Alexandra Stafford · Alexandra's Kitchen · 1 loaf · ~18.75 hours",
        note: "Higher hydration than the beginner recipe. You'll want a proofing basket (banneton) and bench scraper. Worth working up to — produces an exceptional open crumb.",
        stats: [['Hands-on','25 min'],['Total','~18.75 hrs'],['Yield','1 loaf']],
        body: `
<div class="r-note">Inspired by Emilie Raffa's Clever Carrot recipe. Key upgrades: slightly more salt, 4 stretch-and-fold sets during bulk fermentation, and a 24-hour cold proof for a dramatically more open, airy crumb.</div>
<ul class="r-ing">
<li>50–100g (¼–½ cup) bubbly, active starter — use 100g in cold kitchens or cold climates</li>
<li>375g (1½ cups + 1 tbsp) warm water (up to 380g)</li>
<li>500g (4 cups + 2 tbsp) bread flour</li>
<li>9–12g (1.5–2.5 tsp) fine sea salt</li>
</ul>
<div class="r-sub">Instructions</div>
<ol class="r-steps">
<li><strong>Make the dough:</strong> Whisk starter and water together in a large bowl. Add flour and salt, mix to form a rough dough. Cover with a damp towel and rest 30 minutes.</li>
<li><strong>Stretch and fold — 4 sets:</strong> Every 30 min for 2 hours, grab a corner of the dough, stretch it up and over the center of the dough. Rotate the bowl and repeat 4–5 times per set. Even one set will improve your loaf.</li>
<li><strong>Bulk fermentation:</strong> Cover and let rise at ~70°F for 8–10 hours until dough has increased about 50% in volume. Look for bubbles on the surface and a jiggle when you shake the bowl. A straight-sided container makes this easy to monitor.</li>
<li><strong>Shape:</strong> Turn onto lightly floured surface. Fold top to center, turn slightly, fold next section. Repeat all the way around. Flip seam-side down. Use a bench scraper to drag and rotate the dough, building surface tension.</li>
<li><strong>Rest:</strong> Seam-side up on the counter for 30 min. Meanwhile, line an 8" bowl or proofing basket with a flour sack towel dusted with rice flour (rice flour doesn't burn and releases beautifully).</li>
<li>Shape the dough again as in step 4, then place seam-side up in the lined bowl.</li>
<li><strong>Cold proof:</strong> Cover and refrigerate for at least 1 hour — ideally 24 hours, up to 48. The longer cold proof dramatically improves the crumb. Tuck into a loosely-tied produce bag to prevent drying out.</li>
<li>Place Dutch oven in cold oven. Preheat to 550°F. Cut parchment to fit your Dutch oven.</li>
<li><strong>Score:</strong> Place parchment over dough and invert bowl to release. Score with the tip of a small knife or razor blade — a simple X works beautifully.</li>
<li><strong>Bake:</strong> Use parchment to lower dough into preheated Dutch oven. Reduce oven to 450°F. Cover and bake 30 minutes. Remove lid, reduce to 400°F, bake 10–15 more minutes. Optionally lift loaf out and bake directly on the oven rack for the last 5–10 min for the crispest crust.</li>
<li>Cool on a wire rack for at least 1 hour before slicing. Stays fresh up to 3 days at room temp.</li>
</ol>
<div class="r-tip">Want to add cheese, herbs, or jalapeños? Add them before the third stretch-and-fold set, then do a fifth set to ensure even distribution throughout the dough.</div>`
      },
    ]
  }
]

// ─── Styles ──────────────────────────────────────────────────────────────────
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--cream:#f5f0e8;--tan:#e8dcc8;--brown:#7a5c3a;--dark:#2c1f0e;--rust:#b84c2a;--sage:#6b7c5e;--warm:#faf7f2;--mid:#9e8060;--gold:#c9952a}
body{background:var(--cream);color:var(--dark);font-family:'Courier Prime',monospace;min-height:100vh}
header{background:var(--dark);color:var(--cream);padding:1.2rem 1.5rem;display:flex;align-items:center;gap:1rem;border-bottom:3px solid var(--brown)}
.logo{font-family:'Playfair Display',serif;font-size:1.9rem;font-weight:700;color:var(--cream)}
.logo em{color:var(--gold);font-style:normal}
.logo-sub{font-size:0.6rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--mid);margin-top:2px}
.hdr-r{margin-left:auto;text-align:right;font-size:0.72rem;color:var(--mid)}
.streak{color:var(--gold);font-size:0.8rem;margin-top:3px}

/* ── Tabs ── */
.tab-nav{background:var(--dark);border-bottom:2px solid var(--brown);display:flex}
.tab-btn{background:none;border:none;color:var(--mid);padding:.7rem 1.5rem;font-family:'Courier Prime',monospace;font-size:.72rem;letter-spacing:.15em;text-transform:uppercase;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .2s}
.tab-btn:hover{color:var(--cream)}
.tab-btn.active{color:var(--gold);border-bottom-color:var(--gold)}

/* ── Tracker layout ── */
.page{max-width:700px;margin:0 auto;padding:1.5rem 1.2rem 5rem}
.sec-label{font-size:.63rem;letter-spacing:.2em;text-transform:uppercase;color:var(--mid);margin-bottom:.8rem;display:flex;align-items:center;gap:.8rem}
.sec-label::after{content:'';flex:1;height:1px;background:var(--tan)}
.modes{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:1.5rem}
.mode-btn{background:var(--warm);border:2px solid var(--tan);padding:.8rem .4rem;cursor:pointer;text-align:center;transition:all .2s;font-family:'Courier Prime',monospace}
.mode-btn:hover{border-color:var(--brown)}
.mode-btn.active{background:var(--dark);color:var(--cream);border-color:var(--dark)}
.mode-icon{font-size:1.3rem;display:block;margin-bottom:.3rem}
.mode-label{font-size:.63rem;letter-spacing:.08em;text-transform:uppercase;line-height:1.3}
.step-card{background:var(--warm);border:2px solid var(--tan);padding:1.2rem 1.5rem;margin-bottom:.5rem;position:relative;transition:all .2s}
.step-card.active{border-color:var(--brown);border-left:4px solid var(--brown);background:var(--cream)}
.step-card.done{border-color:var(--sage);opacity:.65}
.step-card.done::after{content:'✓';position:absolute;right:1rem;top:50%;transform:translateY(-50%);color:var(--sage);font-size:1.1rem}
.step-card.future{opacity:.4}
.step-num{font-size:.63rem;letter-spacing:.15em;text-transform:uppercase;color:var(--mid);margin-bottom:.3rem}
.step-card.active .step-num{color:var(--brown)}
.step-title{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;margin-bottom:.4rem}
.step-desc{font-size:.78rem;line-height:1.6;color:#5a4030}
.chips{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.7rem}
.chip{background:var(--tan);padding:.2rem .55rem;font-size:.68rem;font-weight:700;border:1px solid var(--mid)}
.log-panel{background:var(--dark);color:var(--cream);padding:1.4rem;margin-bottom:1.5rem;border-left:4px solid var(--gold)}
.log-panel h3{font-family:'Playfair Display',serif;font-size:1.1rem;margin-bottom:.8rem}
.log-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-bottom:.8rem;align-items:flex-end}
.field{display:flex;flex-direction:column;gap:.3rem}
.field label{font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--mid)}
.field input,.field select{background:#3a2a15;border:2px solid #5a4030;color:var(--cream);padding:.5rem .7rem;font-family:'Courier Prime',monospace;font-size:.85rem;outline:none;min-width:110px}
.field input:focus,.field select:focus{border-color:var(--gold)}
.field input[type=number]{width:90px}
.log-btn{background:var(--brown);color:var(--cream);border:none;padding:.6rem 1.4rem;font-family:'Courier Prime',monospace;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:all .2s;align-self:flex-end}
.log-btn:hover{background:var(--gold);color:var(--dark)}
.log-btn:disabled{opacity:.5;cursor:not-allowed}
.history-item{display:flex;gap:1rem;padding:.8rem 1rem;background:var(--warm);border:1px solid var(--tan);margin-bottom:.4rem;align-items:flex-start}
.h-time{font-size:.7rem;color:var(--mid);min-width:75px;flex-shrink:0}
.h-main{flex:1}
.h-mode{font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--mid)}
.h-step{font-size:.85rem;margin:.1rem 0}
.h-amt{font-size:.7rem;color:var(--brown);font-weight:700}
.badge{display:inline-block;font-size:.6rem;background:var(--sage);color:white;padding:.1rem .3rem;margin-left:.4rem;vertical-align:middle}
.timer-card{background:var(--tan);border:2px solid var(--brown);padding:1.2rem 1.5rem;margin-bottom:1.5rem;display:flex;gap:1.2rem;align-items:center}
.timer-icon{font-size:2rem;flex-shrink:0}
.timer-body strong{font-family:'Playfair Display',serif;font-size:1rem;display:block;margin-bottom:.2rem}
.timer-body p{font-size:.78rem;line-height:1.5;color:#5a3020}
.progress{height:4px;background:#d4c4a8;margin-top:.5rem;border-radius:2px;overflow:hidden}
.progress-bar{height:100%;background:var(--brown);transition:width .5s}
.email-setup{background:var(--warm);border:2px dashed var(--mid);padding:1.5rem;margin-bottom:1.5rem}
.email-setup h2{font-family:'Playfair Display',serif;font-size:1.3rem;margin-bottom:.4rem;color:var(--brown)}
.email-setup p{font-size:.8rem;line-height:1.6;color:var(--mid);margin-bottom:1rem}
.email-row{display:flex;gap:.8rem;flex-wrap:wrap}
.email-input{flex:1;background:var(--cream);border:2px solid var(--tan);padding:.6rem .9rem;font-family:'Courier Prime',monospace;font-size:.9rem;color:var(--dark);outline:none;min-width:220px}
.email-input:focus{border-color:var(--brown)}
.email-btn{background:var(--brown);color:var(--cream);border:none;padding:.6rem 1.4rem;font-family:'Courier Prime',monospace;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:all .2s;white-space:nowrap}
.email-btn:hover{background:var(--dark)}
.email-btn:disabled{opacity:.5;cursor:not-allowed}
.advice{background:var(--warm);border:2px dashed var(--mid);padding:1.2rem 1.5rem;margin-bottom:1.5rem;font-size:.78rem;line-height:1.7}
.advice strong{font-family:'Playfair Display',serif;font-style:italic;font-size:.95rem;color:var(--brown);display:block;margin-bottom:.4rem}

/* ── Recipes ── */
.r-intro{background:var(--dark);color:var(--cream);padding:1.5rem;margin-bottom:1.5rem;border-left:4px solid var(--gold)}
.r-intro h2{font-family:'Playfair Display',serif;font-size:1.3rem;margin-bottom:.5rem}
.r-intro p{font-size:.78rem;line-height:1.7;color:var(--tan)}
.r-sec-label{font-size:.63rem;letter-spacing:.2em;text-transform:uppercase;color:var(--mid);margin-bottom:.8rem;display:flex;align-items:center;gap:.8rem}
.r-sec-label::after{content:'';flex:1;height:1px;background:var(--tan)}
.r-card{background:var(--warm);border:2px solid var(--tan);margin-bottom:.6rem;cursor:pointer;transition:border-color .2s}
.r-card:hover{border-color:var(--brown)}
.r-card.featured{border-color:var(--gold);border-left:4px solid var(--gold)}
.r-card-hdr{padding:1rem 1.2rem;display:flex;align-items:flex-start;gap:1rem}
.r-icon{font-size:1.4rem;flex-shrink:0;margin-top:.1rem}
.r-info{flex:1}
.r-title{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;margin-bottom:.2rem}
.r-card.featured .r-title{color:var(--brown)}
.r-meta{font-size:.68rem;color:var(--mid);letter-spacing:.05em}
.r-card-note{font-size:.72rem;color:var(--sage);margin-top:.3rem;font-style:italic;line-height:1.5}
.r-chevron{color:var(--mid);font-size:.8rem;flex-shrink:0;transition:transform .2s;margin-top:.3rem}
.r-card.open .r-chevron{transform:rotate(90deg)}
.r-body{display:none;padding:0 1.2rem 1.2rem;border-top:1px solid var(--tan)}
.r-card.open .r-body{display:block}
.r-stats{display:flex;gap:1.5rem;flex-wrap:wrap;margin:.8rem 0;padding:.8rem;background:var(--tan)}
.r-stat{display:flex;flex-direction:column;gap:.1rem}
.r-stat-lbl{font-size:.58rem;letter-spacing:.15em;text-transform:uppercase;color:var(--mid)}
.r-stat-val{font-size:.85rem;font-weight:700}
.r-sub{font-size:.68rem;letter-spacing:.15em;text-transform:uppercase;color:var(--brown);margin:1rem 0 .4rem;border-bottom:1px solid var(--tan);padding-bottom:.3rem}
.r-ing{list-style:none;margin:0 0 .5rem}
.r-ing li{font-size:.8rem;line-height:1.7;padding:.2rem 0;border-bottom:1px solid var(--tan);display:flex;gap:.5rem}
.r-ing li::before{content:'—';color:var(--rust);flex-shrink:0}
.r-steps{margin:0 0 .5rem;counter-reset:step;list-style:none}
.r-steps li{font-size:.8rem;line-height:1.6;padding:.5rem 0 .5rem 2.2rem;border-bottom:1px solid var(--tan);position:relative;counter-increment:step}
.r-steps li::before{content:counter(step);position:absolute;left:0;top:.45rem;background:var(--brown);color:var(--cream);width:1.4rem;height:1.4rem;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700}
.r-note{background:var(--cream);border-left:3px solid var(--sage);padding:.7rem 1rem;margin:.8rem 0;font-size:.75rem;line-height:1.6;color:#5a4030;font-style:italic}
.r-tip{background:var(--cream);border-left:3px solid var(--gold);padding:.7rem 1rem;margin:.8rem 0;font-size:.75rem;line-height:1.6;color:#5a4030}
.r-formula{background:var(--dark);color:var(--cream);padding:1rem;margin:.8rem 0;font-size:.8rem;line-height:2}
.r-formula .pct{color:var(--gold);font-weight:700;display:inline-block;min-width:3rem}
.r-section{margin-bottom:2rem}

/* ── Toast ── */
.toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(100px);background:var(--dark);color:var(--cream);padding:.9rem 1.8rem;font-family:'Playfair Display',serif;font-style:italic;font-size:1rem;border-left:4px solid var(--gold);transition:transform .4s cubic-bezier(.34,1.56,.64,1);z-index:9999;max-width:90vw;text-align:center;pointer-events:none}
.toast.show{transform:translateX(-50%) translateY(0)}
@media(max-width:500px){.modes{grid-template-columns:repeat(2,1fr)}.log-row{flex-direction:column}.log-btn{width:100%}header{padding:1rem}.logo{font-size:1.6rem}}
`

// ─── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const [tab, setTab]                   = useState('tracker')
  const [email, setEmail]               = useState('')
  const [emailInput, setEmailInput]     = useState('')
  const [userId, setUserId]             = useState(null)
  const [mode, setMode]                 = useState(null)
  const [currentStep, setCurrentStep]   = useState(null)
  const [entries, setEntries]           = useState([])
  const [obs, setObs]                   = useState('')
  const [note, setNote]                 = useState('')
  const [starterWeight, setStarterWeight] = useState('')
  const [jarTotalWeight, setJarTotalWeight] = useState('')
  const [timeStr, setTimeStr]           = useState('')
  const [toast, setToast]               = useState('')
  const [lastLoggedObs, setLastLoggedObs] = useState(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [showEmailSetup, setShowEmailSetup] = useState(false)
  const [streak, setStreak]             = useState(null)
  const [openRecipe, setOpenRecipe]     = useState(null)

  useEffect(() => {
    const now = new Date()
    setTimeStr(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`)
  }, [mode, currentStep])

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('leven_uid') : null
    if (saved) loadUser(saved)
    else setShowEmailSetup(true)

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        const uid = localStorage.getItem('leven_uid')
        if (uid) loadUser(uid)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  async function loadUser(uid) {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*, entries(mode, step_index, step_title, observation, note, amounts, logged_time, logged_at, created_at, email_sent)')
      .eq('id', uid)
      .order('created_at', { foreignTable: 'entries', ascending: false })
      .limit(20, { foreignTable: 'entries' })
      .single()
    if (data) {
      const entries = data.entries || []

      // Self-heal: if the most recent log entry is ahead of current_step on the
      // user record, the user table is stale. Derive the correct step from entries
      // and write it back so future loads are consistent.
      let resolvedStep = data.current_step ?? 0
      if (entries.length > 0) {
        const lastEntry = entries[0] // ordered descending by created_at
        if (lastEntry.mode === data.current_mode) {
          const derivedStep = lastEntry.step_index + 1
          if (derivedStep > resolvedStep) {
            resolvedStep = derivedStep
            // Write the corrected value back to Supabase silently
            supabase.from('users').update({ current_step: resolvedStep }).eq('id', uid)
          }
        }
      }

      ReactDOM.unstable_batchedUpdates(() => {
        setUserId(data.id)
        setEmail(data.email)
        setMode(data.current_mode)
        setCurrentStep(resolvedStep)
        setEntries(entries)
      })
      calcStreak(entries)
    } else {
      localStorage.removeItem('leven_uid'); setShowEmailSetup(true)
    }
    setLoading(false)
  }

  function calcStreak(ents) {
    const seen = new Set(ents.map(e => new Date(e.created_at).toISOString().slice(0,10)))
    let s = 0; const now = new Date()
    for (let i = 0; i < 60; i++) {
      const d = new Date(now); d.setDate(d.getDate()-i)
      if (seen.has(d.toISOString().slice(0,10))) s++; else if (i>0) break
    }
    setStreak(s)
  }

  async function registerEmail() {
    if (!emailInput.trim() || !emailInput.includes('@')) { showToast('Please enter a valid email'); return }
    setSaving(true)
    const trimmed = emailInput.trim().toLowerCase()

    // Try to insert new user
    const { data, error } = await supabase.from('users')
      .insert({ email: trimmed, current_mode: null, current_step: 0 })
      .select().single()

    if (error) {
      // Duplicate email — look up existing user and log them back in
      if (error.code === '23505' || (error.message && (error.message.includes('unique') || error.message.includes('duplicate')))) {
        const { data: existing } = await supabase.from('users').select('*').eq('email', trimmed).single()
        if (existing) {
          localStorage.setItem('leven_uid', existing.id)
          setShowEmailSetup(false)
          showToast('Welcome back! Your data has been restored 🌾')
          setSaving(false)
          loadUser(existing.id)
          return
        }
      }
      showToast('Error saving — try again')
      setSaving(false)
      return
    }

    localStorage.setItem('leven_uid', data.id)
    setUserId(data.id); setEmail(data.email); setShowEmailSetup(false)
    await fetch('/api/welcome', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: data.email, userId: data.id }) })
    showToast('Welcome! Reminders are now active 📬')
    setSaving(false)
  }

  async function selectMode(m) {
    if (mode === m) { showToast(MODES[m].label + ' selected'); return }

    // Switching to a different mode — fetch the real saved step for that mode
    // from the user's entries rather than blindly resetting to 0.
    setMode(m)
    setCurrentStep(null) // show loading state while we fetch

    let resolvedStep = 0
    if (userId) {
      const { data: lastEntry } = await supabase
        .from('entries')
        .select('step_index')
        .eq('user_id', userId)
        .eq('mode', m)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (lastEntry) resolvedStep = lastEntry.step_index + 1
    }

    // Cap at the last step (don't go past "all complete")
    const maxStep = MODES[m].steps.length
    resolvedStep = Math.min(resolvedStep, maxStep)

    setCurrentStep(resolvedStep)
    if (userId) await supabase.from('users').update({ current_mode: m, current_step: resolvedStep }).eq('id', userId)
    showToast(MODES[m].label + ' selected')
  }

  async function logStep() {
    if (!userId || !mode) return
    const step = MODES[mode].steps[currentStep]
    if (!step) return
    setSaving(true)
    let amounts = {}
    if (starterWeight && parseFloat(starterWeight)) {
      const w = parseFloat(starterWeight)
      amounts = { starter: w, water: w, flour: w, total: w*3 }
    }

    // Convert user-inputted HH:MM to a proper UTC timestamp.
    // The time picker shows local time, so we reconstruct it using today's
    // local date + the inputted HH:MM, giving us the correct UTC value.
    let loggedAt = new Date().toISOString() // fallback: now
    if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
      const [h, m] = timeStr.split(':').map(Number)
      const local = new Date()
      local.setHours(h, m, 0, 0)
      // If the inputted time is more than 1 hour in the future, assume it was yesterday
      if (local.getTime() > Date.now() + 3600000) {
        local.setDate(local.getDate() - 1)
      }
      loggedAt = local.toISOString()
    }

    const { error: entryError } = await supabase.from('entries').insert({
      user_id: userId, mode, step_index: currentStep, step_title: step.title,
      observation: obs||null, note: note||null, amounts, logged_time: timeStr,
      logged_at: loggedAt,
      check_window_min: step.checkWindow?.[0]||null, check_window_max: step.checkWindow?.[1]||null,
    })
    if (entryError) {
      console.error('Entry insert failed:', entryError)
      showToast('Error saving entry — check console')
      setSaving(false)
      return
    }
    const nextStep = currentStep + 1
    setCurrentStep(nextStep)
    const { error: userError } = await supabase.from('users').update({ current_mode: mode, current_step: nextStep, last_entry_at: loggedAt }).eq('id', userId)
    if (userError) {
      console.error('User step update failed:', userError)
      showToast('Step logged but progress save failed — check RLS policies')
    }
    const { data: newEntries } = await supabase.from('entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(15)
    setEntries(newEntries||[]); calcStreak(newEntries||[])
    const savedObs = obs
    setObs(''); setNote(''); setStarterWeight(''); setJarTotalWeight('')
    setLastLoggedObs(savedObs || null)
    const feedbacks = { 'no-activity':'No activity yet — more time needed.', 'no-double':'Didn\'t double — check the troubleshooting guide.', ready:'🎉 Ready to bake!', rising:'Rising well — check back soon!', peaked:'Perfect timing!', liquid:'Hooch is fine — stir it in and feed!' }
    showToast(feedbacks[savedObs] || ['Logged! 🌾','Nice work!','Tracking!','Great care!'][Math.floor(Math.random()*4)])
    setSaving(false)
  }

  async function resetCycle() {
    setCurrentStep(0)
    if (userId) await supabase.from('users').update({ current_step: 0 }).eq('id', userId)
    showToast('New cycle started')
  }

  async function unsubscribe() {
    if (!userId) return
    await supabase.from('users').update({ reminders_active: false }).eq('id', userId)
    showToast('Reminders paused — reload to re-enable')
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const currentMode     = mode ? MODES[mode] : null
  const currentStepData = currentMode ? currentMode.steps[currentStep] : null
  const hasWeight       = currentStepData && (currentStepData.title.includes('Feed') || currentStepData.title.includes('Discard') || currentStepData.title.includes('Revive'))
  const isObsStep       = currentStepData && (currentStepData.title.toLowerCase().includes('check') || currentStepData.title.toLowerCase().includes('watch') || currentStepData.title.toLowerCase().includes('rise'))

  return (
    <>
      <Head>
        <title>Leven — Sarver Farms Starter Tracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <style>{CSS}</style>

      <header>
        <div>
          <div className="logo">Le<em>ven</em></div>
          <div className="logo-sub">Sarver Farms · Starter Tracker</div>
        </div>
        <div className="hdr-r">
          <div>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
          {streak > 0 && <div className="streak">🌾 {streak} day streak</div>}
          {email && <div style={{marginTop:4,fontSize:'0.65rem',color:'#5a4030'}}>{email}</div>}
        </div>
      </header>

      {/* Tab nav */}
      <nav className="tab-nav">
        <button className={`tab-btn${tab==='tracker'?' active':''}`} onClick={() => setTab('tracker')}>🌾 Starter Tracker</button>
        <button className={`tab-btn${tab==='recipes'?' active':''}`} onClick={() => setTab('recipes')}>📖 Recipes</button>
        <button className={`tab-btn${tab==='jar'?' active':''}`} onClick={() => setTab('jar')}>⚖️ Jar Weight</button>
        <button className={`tab-btn${tab==='troubleshoot'?' active':''}`} onClick={() => setTab('troubleshoot')}>🔧 Troubleshooting</button>
      </nav>

      {/* ══ TRACKER TAB ══ */}
      <div style={{display: tab === 'tracker' ? 'block' : 'none'}}>{(() => (
        <main className="page">
          {loading && <div style={{textAlign:'center',padding:'2rem',color:'var(--mid)',fontSize:'.8rem'}}>Loading…</div>}

          {showEmailSetup && (
            <div className="email-setup">
              <h2>🌾 Welcome to Leven</h2>
              <p>Enter your email address to get started. That's all you need — the app will track your starter and send automatic reminders at every check window. No account, no password.</p>
              <div className="email-row">
                <input className="email-input" type="email" placeholder="your@email.com" value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => e.key==='Enter' && registerEmail()} />
                <button className="email-btn" onClick={registerEmail} disabled={saving}>{saving ? 'Setting up…' : '→ Get Started'}</button>
              </div>
            </div>
          )}

          <TimerCard entries={entries} mode={mode} />

          {!showEmailSetup && (
            <>
              <div className="sec-label">What are you doing with your starter?</div>
              <div className="modes">
                {Object.entries(MODES).map(([key, m]) => (
                  <button key={key} className={`mode-btn${mode===key?' active':''}`} onClick={() => selectMode(key)}>
                    <span className="mode-icon">{MODE_ICONS[key]}</span>
                    <span className="mode-label">{m.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {mode && <Advice mode={mode} />}

          {currentMode && currentStep !== null && !loading && (
            <>
              <div className="sec-label">{currentMode.label} — Steps</div>
              {currentMode.steps.map((step, i) => (
                <div key={i} className={`step-card${!loading && i===currentStep?' active':!loading && i<currentStep?' done':' future'}`}>
                  <div className="step-num">Step {i+1} of {currentMode.steps.length}{step.optional && <span style={{fontSize:'.6rem',background:'#b84c2a',color:'white',padding:'1px 5px',marginLeft:6}}>if needed</span>}</div>
                  <div className="step-title">{step.title}</div>
                  <div className="step-desc">{step.desc}</div>
                  {step.amounts?.length > 0 && <div className="chips">{step.amounts.map((a,j) => <span key={j} className="chip">{a}</span>)}</div>}
                </div>
              ))}
            </>
          )}

          {currentMode && currentStepData && (
            <div className="log-panel">
              <h3>Log: Step {currentStep+1} — {currentStepData.title}</h3>
              <div className="log-row">
                <div className="field">
                  <label>Time done</label>
                  <input type="time" value={timeStr} onChange={e => setTimeStr(e.target.value)} />
                </div>
                {hasWeight && (() => {
                  const JAR_TARE = 363 // mason jar without lid
                  const jarTotal = parseFloat(jarTotalWeight)
                  const computed = !isNaN(jarTotal) && jarTotal > JAR_TARE ? Math.round(jarTotal - JAR_TARE) : null
                  // Keep starterWeight in sync with computed value
                  if (computed !== null && String(computed) !== starterWeight) {
                    setTimeout(() => setStarterWeight(String(computed)), 0)
                  }
                  const half     = computed ? Math.round(computed / 2) : null
                  const isNoDiscard = currentStepData.title.toLowerCase().includes('no discard')
                  const isDiscard   = !isNoDiscard && currentStepData.title.toLowerCase().includes('discard')
                  const isFeed      = currentStepData.title.toLowerCase().includes('feed') || currentStepData.title.toLowerCase().includes('revive')
                  // afterDiscard logic:
                  // - isDiscard + isFeed (e.g. fridge "Feed 1:1:1 then refrigerate"): discard half, feed remaining
                  // - isDiscard only (e.g. "Discard half your starter"): discard half, show target weight
                  // - isFeed only, no discard (e.g. Counter "Feed 1:1:1"): NO discard, feed full starter weight
                  // - isNoDiscard (explicitly "NO discard" in title): feed full starter, no discard step
                  const afterDiscard = (isNoDiscard || (!isDiscard && isFeed))
                    ? computed                                    // feed full starter, no discard
                    : (computed && half ? computed - half : null) // discard half first, then feed remaining
                  const feedBase = afterDiscard  // water and flour match this amount
                  return (
                    <div style={{flex:'1 1 100%',marginTop:'.5rem'}}>
                      <div style={{background:'#3a2a15',border:'2px solid #5a4030',padding:'1rem',marginBottom:'.5rem'}}>
                        <div style={{fontSize:'.62rem',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--mid)',marginBottom:'.5rem'}}>⚖️ Jar calculator — mason jar without lid (363g)</div>
                        <div style={{display:'flex',gap:'.8rem',alignItems:'flex-end',flexWrap:'wrap'}}>
                          <div className="field">
                            <label>Total weight on scale (g)</label>
                            <input
                              type="number" placeholder="e.g. 450"
                              value={jarTotalWeight}
                              onChange={e => setJarTotalWeight(e.target.value)}
                              min="364" max="5000"
                              style={{width:'130px'}}
                            />
                          </div>
                          {computed !== null && (
                            <div style={{display:'flex',gap:'1.2rem',flexWrap:'wrap',paddingBottom:'.4rem'}}>
                              <div>
                                <div style={{fontSize:'.58rem',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--mid)'}}>Starter</div>
                                <div style={{fontSize:'1.3rem',fontWeight:700,color:'var(--gold)'}}>{computed}g</div>
                              </div>
                              {/* Normal discard + feed steps */}
                              {!isNoDiscard && (isDiscard || isFeed) && half !== null && (() => {
                                const afterDiscardOnScale = isDiscard ? Math.round(jarTotal - half) : Math.round(jarTotal)
                                const waterTarget = afterDiscardOnScale + (feedBase || 0)
                                const flourTarget = waterTarget + (feedBase || 0)
                                return (
                                  <>
                                    <div style={{color:'var(--mid)',alignSelf:'center'}}>→</div>
                                    <div style={{background:'#2a1e0e',border:'1px solid #5a4030',padding:'.6rem .8rem',display:'flex',flexDirection:'column',gap:'.4rem',minWidth:'170px'}}>
                                      <div style={{fontSize:'.58rem',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--mid)',marginBottom:'.2rem'}}>Scale targets</div>
                                      {isDiscard && (
                                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem'}}>
                                          <span style={{fontSize:'.72rem',color:'#b84c2a'}}>discard {half}g →</span>
                                          <span style={{fontSize:'1.1rem',fontWeight:700,color:'var(--cream)'}}>{afterDiscardOnScale}g</span>
                                        </div>
                                      )}
                                      {isFeed && feedBase && (
                                        <>
                                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem'}}>
                                            <span style={{fontSize:'.72rem',color:'var(--gold)'}}>+ {feedBase}g water →</span>
                                            <span style={{fontSize:'1.1rem',fontWeight:700,color:'var(--gold)'}}>{waterTarget}g</span>
                                          </div>
                                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem'}}>
                                            <span style={{fontSize:'.72rem',color:'var(--gold)'}}>+ {feedBase}g flour →</span>
                                            <span style={{fontSize:'1.1rem',fontWeight:700,color:'var(--gold)'}}>{flourTarget}g</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )
                              })()}
                              {/* NO discard feed — add equal water + flour to full starter, no discard step */}
                              {isNoDiscard && isFeed && feedBase && (() => {
                                const waterTarget = jarTotal + feedBase   // jar still has full starter, add water
                                const flourTarget = waterTarget + feedBase // then add flour on top
                                return (
                                  <>
                                    <div style={{color:'var(--mid)',alignSelf:'center',fontSize:'.8rem'}}>→ no discard</div>
                                    <div style={{background:'#2a1e0e',border:'1px solid #5a4030',padding:'.6rem .8rem',display:'flex',flexDirection:'column',gap:'.4rem',minWidth:'160px'}}>
                                      <div style={{fontSize:'.58rem',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--mid)',marginBottom:'.2rem'}}>Scale targets</div>
                                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem'}}>
                                        <span style={{fontSize:'.72rem',color:'#9e8060'}}>Current</span>
                                        <span style={{fontSize:'1.1rem',fontWeight:700,color:'var(--cream)'}}>{Math.round(jarTotal)}g</span>
                                      </div>
                                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem'}}>
                                        <span style={{fontSize:'.72rem',color:'var(--gold)'}}>+ {feedBase}g water →</span>
                                        <span style={{fontSize:'1.1rem',fontWeight:700,color:'var(--gold)'}}>{Math.round(waterTarget)}g</span>
                                      </div>
                                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem'}}>
                                        <span style={{fontSize:'.72rem',color:'var(--gold)'}}>+ {feedBase}g flour →</span>
                                        <span style={{fontSize:'1.1rem',fontWeight:700,color:'var(--gold)'}}>{Math.round(flourTarget)}g</span>
                                      </div>
                                    </div>
                                  </>
                                )
                              })()}
                            </div>
                          )}
                          {jarTotalWeight && (isNaN(jarTotal) || jarTotal <= JAR_TARE) ? (
                            <div style={{fontSize:'.72rem',color:'#ffaaaa'}}>⚠️ Must be more than 363g (jar weight)</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })()}
                {isObsStep && (
                  <div className="field">
                    <label>What did you observe?</label>
                    <select value={obs} onChange={e => setObs(e.target.value)}>
                      <option value="">-- Select --</option>
                      <option value="rising">Rising well (bubbles, dome)</option>
                      <option value="peaked">Peaked / at max rise</option>
                      <option value="falling">Falling / deflating</option>
                      <option value="no-double">Didn't double</option>
                      <option value="no-activity">No activity yet</option>
                      <option value="liquid">Liquid on top (hooch)</option>
                      <option value="ready">Ready to bake! (2×+ rise)</option>
                    </select>
                  </div>
                )}
                <div className="field" style={{flex:1}}>
                  <label>Note (optional)</label>
                  <input type="text" placeholder="smell, temp, activity…" value={note} onChange={e => setNote(e.target.value)} />
                </div>
                <button className="log-btn" onClick={logStep} disabled={saving || !userId}>{saving ? 'Saving…' : '→ Log It'}</button>
              </div>
              {currentStepData.checkWindow && email && (
                <div style={{fontSize:'.67rem',color:'#c9952a',marginTop:4}}>
                  📬 Reminder email scheduled at the {currentStepData.checkWindow[0]}–{currentStepData.checkWindow[1]} hr mark
                </div>
              )}
            </div>
          )}

          {/* Inline feedback after logging */}
          {lastLoggedObs && ['liquid','no-activity','falling','no-double'].includes(lastLoggedObs) && (
            <InlineFeedback obs={lastLoggedObs} onDismiss={() => setLastLoggedObs(null)} setTab={setTab} />
          )}

          {/* Quick troubleshoot access button */}
          {!lastLoggedObs && mode && (
            <div style={{textAlign:'right',marginBottom:'1rem'}}>
              <button onClick={() => setTab('troubleshoot')} style={{background:'none',border:'1px solid var(--mid)',color:'var(--mid)',padding:'.3rem .8rem',fontFamily:'Courier Prime,monospace',fontSize:'.65rem',letterSpacing:'.1em',textTransform:'uppercase',cursor:'pointer'}}>
                🔧 Troubleshooting
              </button>
            </div>
          )}

          {currentMode && currentStep >= currentMode.steps.length && (
            <div className="log-panel" style={{borderColor:'#6b7c5e'}}>
              <h3>🎉 All steps complete!</h3>
              <p style={{fontSize:'.8rem',color:'#a8c8a0',marginBottom:'1rem'}}>You've finished the {currentMode.label} process.</p>
              <button className="log-btn" style={{background:'#6b7c5e'}} onClick={resetCycle}>Start New Cycle</button>
            </div>
          )}

          {entries.length > 0 && (
            <>
              <div className="sec-label" style={{marginTop:'1.5rem'}}>Activity log</div>
              {entries.slice(0,10).map((e,i) => {
                const d = new Date(e.created_at)
                const ds = d.toLocaleDateString('en-US',{month:'short',day:'numeric'})
                const ts = e.logged_time || d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})
                let amtStr = ''
                if (e.amounts?.starter) amtStr = `${e.amounts.starter}g → +${e.amounts.water}g water + ${e.amounts.flour}g flour`
                return (
                  <div key={i} className="history-item">
                    <div className="h-time">{ds}<br/>{ts}</div>
                    <div className="h-main">
                      <div className="h-mode">{MODE_ICONS[e.mode]||''} {MODES[e.mode]?.label||e.mode} · Step {(e.step_index||0)+1}{e.email_sent && <span className="badge">📬</span>}</div>
                      <div className="h-step">{e.step_title}</div>
                      {amtStr && <div className="h-amt">{amtStr}</div>}
                      {e.observation && <div style={{fontSize:'.7rem',color:'#6b7c5e',marginTop:2}}>{OBS_LABELS[e.observation]||e.observation}</div>}
                      {e.note && <div style={{fontSize:'.7rem',color:'var(--mid)',fontStyle:'italic',marginTop:2}}>"{e.note}"</div>}
                    </div>
                    <div>{MODE_ICONS[e.mode]||'📝'}</div>
                  </div>
                )
              })}
            </>
          )}

          {email && <div style={{textAlign:'center',marginTop:'2rem'}}><button onClick={unsubscribe} style={{background:'none',border:'none',color:'var(--mid)',fontSize:'.7rem',cursor:'pointer',textDecoration:'underline'}}>Pause email reminders</button></div>}
        </main>
      ))()}</div>

      {/* ══ JAR WEIGHT TAB ══ */}
      <div style={{display: tab === 'jar' ? 'block' : 'none'}}><JarWeightTab /></div>
      <div style={{display: tab === 'troubleshoot' ? 'block' : 'none'}}><TroubleshootTab setTab={setTab} /></div>

      {/* ══ RECIPES TAB ══ */}
      <div style={{display: tab === 'recipes' ? 'block' : 'none'}}>
        <main className="page">
          <div className="r-intro">
            <h2>🌾 Sarver Farms Recipe Collection</h2>
            <p>Tested recipes that work great with your heirloom starter. Start with the Beginner's Guide if you're new to sourdough bread — it's the clearest path from starter to first loaf. Recipes marked ♻ are great for using up discard from your regular feedings.</p>
          </div>

          {RECIPE_SECTIONS.map(section => (
            <div key={section.id} className="r-section">
              <div className="r-sec-label">{section.label}</div>
              {section.recipes.map(recipe => (
                <div
                  key={recipe.id}
                  className={`r-card${recipe.featured?' featured':''}${openRecipe===recipe.id?' open':''}`}
                  onClick={() => setOpenRecipe(openRecipe===recipe.id ? null : recipe.id)}
                >
                  <div className="r-card-hdr">
                    <div className="r-icon">{recipe.icon}</div>
                    <div className="r-info">
                      <div className="r-title">{recipe.title}</div>
                      <div className="r-meta">{recipe.meta}</div>
                      {recipe.note && <div className="r-card-note">{recipe.note}</div>}
                    </div>
                    <div className="r-chevron">▶</div>
                  </div>
                  {openRecipe === recipe.id && (
                    <div className="r-body" onClick={e => e.stopPropagation()}>
                      {recipe.stats?.length > 0 && (
                        <div className="r-stats">
                          {recipe.stats.map(([lbl, val]) => (
                            <div key={lbl} className="r-stat">
                              <span className="r-stat-lbl">{lbl}</span>
                              <span className="r-stat-val">{val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div dangerouslySetInnerHTML={{ __html: recipe.body }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </main>
      </div>

      <div className={`toast${toast?' show':''}`}>{toast}</div>
    </>
  )
}

// ─── Timer sub-component ──────────────────────────────────────────────────────
function TimerCard({ entries, mode }) {
  const [now, setNow] = useState(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  if (!now || !entries.length || !mode) return null
  const last = entries[0]
  if (last.mode !== mode) return null
  const modeData = MODES[mode]
  const si = last.step_index
  if (si >= modeData.steps.length) return null
  const step = modeData.steps[si]
  if (!step?.checkWindow) return null

  const [minH, maxH] = step.checkWindow
  const midH     = (minH + maxH) / 2
  const refTime  = last.logged_at || last.created_at
  const elapsed  = (now - new Date(refTime).getTime()) / 3600000
  const remaining = maxH - elapsed
  const pct      = Math.min(100, (elapsed / maxH) * 100)

  let icon = '⏳', msg = '', overdue = false
  if (elapsed < minH) {
    const checkIn = minH - elapsed
    msg = `Check back in ${Math.floor(checkIn)}h ${Math.round((checkIn%1)*60)}m — the ${minH}–${maxH} hr window begins then.`
  } else if (elapsed < midH) {
    icon = '👁️'
    msg = `Time to check! You're in the early window. ${Math.floor(remaining)}h ${Math.round((remaining%1)*60)}m until peak.`
  } else if (elapsed < maxH) {
    icon = '⏰'
    msg = `Feed now! Peak activity window. ${Math.floor(remaining)}h ${Math.round((remaining%1)*60)}m remaining.`
  } else {
    icon = '🚨'; msg = 'Window passed — check your starter and log now.'; overdue = true
  }

  return (
    <div className="timer-card" style={overdue ? {borderColor:'#b84c2a',background:'#fff5f0'} : {}}>
      <div className="timer-icon">{icon}</div>
      <div className="timer-body">
        <strong>Step {si+1}: {step.title}</strong>
        <p>{msg}</p>
        <div className="progress"><div className="progress-bar" style={{width:`${pct}%`,background:overdue?'#b84c2a':'var(--brown)'}} /></div>
      </div>
    </div>
  )
}

// ─── Advice sub-component ─────────────────────────────────────────────────────
function Advice({ mode }) {
  const tips = {
    refresh: { title: 'About the Starter Refresh', text: 'Two feedings without discarding rebuilds strength. Look for 1.5× rise as your green light. The sugar trick in Step 5 often revives a sluggish starter — and Sarver Farms will replace it for free if nothing works.' },
    counter: { title: 'Counter Starter Tips', text: 'Feed when you see it rise and fall — usually 4–12 hours. Cooler kitchens (55–65°F) slow things down. Save discard in a fridge bowl for recipes; use within a week!' },
    fridge:  { title: 'Fridge Storage Tips', text: 'Always feed before refrigerating. Hooch on top means it\'s hungry — safe to use, just stir in or pour off. Not active after reviving? Try the full Starter Refresh method.' },
    longterm:{ title: 'Long-Term Dry Storage', text: 'Keep drying temperature below 85–90°F or you\'ll kill the yeast. Refresh dried starter once a year. Silica gel in sealed plastic keeps chips bone dry for 1+ year.' },
  }
  const t = tips[mode]
  if (!t) return null
  return <div className="advice"><strong>{t.title}</strong>{t.text}</div>
}

// ─── Jar Weight Tab ───────────────────────────────────────────────────────────
function JarWeightTab() {
  const [totalWeight, setTotalWeight] = useState('')
  const [selectedJar, setSelectedJar] = useState('with-lid')

  const JARS = {
    'with-lid':    { label: 'Mason jar with lid',    weight: 380 },
    'without-lid': { label: 'Mason jar without lid', weight: 363 },
  }

  const jar = JARS[selectedJar]
  const total = parseFloat(totalWeight)
  const starterWeight = !isNaN(total) && total > jar.weight ? (total - jar.weight) : null
  const feedAmount = starterWeight ? Math.round(starterWeight) : null

  return (
    <main className="page">
      <div className="r-intro">
        <h2>⚖️ Mason Jar Weights</h2>
        <p>Use this to find out how much starter you have without removing it from the jar. Weigh your jar on a scale, enter the total below, and we'll subtract the jar weight for you.</p>
      </div>

      {/* Reference cards */}
      <div className="sec-label">Jar reference weights</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.8rem',marginBottom:'1.5rem'}}>
        <div style={{background:'var(--warm)',border:'2px solid var(--tan)',padding:'1.2rem',textAlign:'center'}}>
          <div style={{fontSize:'1.8rem',marginBottom:'.4rem'}}>🫙</div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'1.1rem',fontWeight:700,marginBottom:'.3rem'}}>Without lid</div>
          <div style={{fontSize:'1.6rem',fontWeight:700,color:'var(--brown)',fontFamily:'Courier Prime,monospace'}}>363g</div>
        </div>
        <div style={{background:'var(--warm)',border:'2px solid var(--tan)',padding:'1.2rem',textAlign:'center'}}>
          <div style={{fontSize:'1.8rem',marginBottom:'.4rem'}}>🫙</div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'1.1rem',fontWeight:700,marginBottom:'.3rem'}}>With lid</div>
          <div style={{fontSize:'1.6rem',fontWeight:700,color:'var(--brown)',fontFamily:'Courier Prime,monospace'}}>380g</div>
        </div>
      </div>

      {/* Calculator */}
      <div className="sec-label">Starter weight calculator</div>
      <div style={{background:'var(--dark)',color:'var(--cream)',padding:'1.4rem',borderLeft:'4px solid var(--gold)',marginBottom:'1.5rem'}}>
        <h3 style={{fontFamily:'Playfair Display,serif',fontSize:'1.1rem',marginBottom:'1rem'}}>How much starter do I have?</h3>

        <div style={{display:'flex',gap:'.8rem',flexWrap:'wrap',marginBottom:'1rem',alignItems:'flex-end'}}>
          <div className="field">
            <label>Jar type</label>
            <select
              value={selectedJar}
              onChange={e => setSelectedJar(e.target.value)}
              style={{background:'#3a2a15',border:'2px solid #5a4030',color:'var(--cream)',padding:'.5rem .7rem',fontFamily:'Courier Prime,monospace',fontSize:'.85rem',minWidth:'160px'}}
            >
              <option value="with-lid">With lid (380g)</option>
              <option value="without-lid">Without lid (363g)</option>
            </select>
          </div>
          <div className="field">
            <label>Total weight on scale (g)</label>
            <input
              type="number"
              placeholder="e.g. 450"
              value={totalWeight}
              onChange={e => setTotalWeight(e.target.value)}
              min="1"
              style={{background:'#3a2a15',border:'2px solid #5a4030',color:'var(--cream)',padding:'.5rem .7rem',fontFamily:'Courier Prime,monospace',fontSize:'.85rem',width:'140px',outline:'none'}}
            />
          </div>
        </div>

        {starterWeight !== null ? (
          <div style={{background:'#3a2a15',border:'2px solid var(--gold)',padding:'1rem 1.2rem'}}>
            <div style={{fontSize:'.62rem',letterSpacing:'.15em',textTransform:'uppercase',color:'var(--gold)',marginBottom:'.4rem'}}>You have</div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'2rem',fontWeight:700,color:'var(--cream)',marginBottom:'.3rem'}}>{starterWeight}g of starter</div>
            <div style={{fontSize:'.75rem',color:'#9e8060',lineHeight:1.6}}>
              {total}g total − {jar.weight}g ({jar.label}) = <strong style={{color:'var(--cream)'}}>{starterWeight}g starter</strong>
            </div>
            <div style={{marginTop:'1rem',borderTop:'1px solid #5a4030',paddingTop:'.8rem'}}>
              <div style={{fontSize:'.62rem',letterSpacing:'.15em',textTransform:'uppercase',color:'var(--mid)',marginBottom:'.5rem'}}>For a 1:1:1 feed add</div>
              <div style={{display:'flex',gap:'1rem',flexWrap:'wrap'}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'1.2rem',fontWeight:700,color:'var(--gold)'}}>{feedAmount}g</div>
                  <div style={{fontSize:'.65rem',color:'var(--mid)',textTransform:'uppercase',letterSpacing:'.1em'}}>water</div>
                </div>
                <div style={{color:'var(--mid)',alignSelf:'center',fontSize:'1rem'}}>+</div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'1.2rem',fontWeight:700,color:'var(--gold)'}}>{feedAmount}g</div>
                  <div style={{fontSize:'.65rem',color:'var(--mid)',textTransform:'uppercase',letterSpacing:'.1em'}}>flour</div>
                </div>
                <div style={{color:'var(--mid)',alignSelf:'center',fontSize:'1rem'}}>=</div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'1.2rem',fontWeight:700,color:'var(--cream)'}}>{starterWeight + feedAmount * 2}g</div>
                  <div style={{fontSize:'.65rem',color:'var(--mid)',textTransform:'uppercase',letterSpacing:'.1em'}}>total</div>
                </div>
              </div>
            </div>
          </div>
        ) : totalWeight && !isNaN(total) ? (
          <div style={{background:'#3a2a15',border:'2px solid var(--rust)',padding:'.8rem 1rem',fontSize:'.8rem',color:'#ffaaaa'}}>
            ⚠️ Total weight ({total}g) is less than or equal to the jar weight ({jar.weight}g) — check your scale reading.
          </div>
        ) : (
          <div style={{fontSize:'.75rem',color:'var(--mid)',fontStyle:'italic'}}>
            Enter the total weight shown on your scale above ↑
          </div>
        )}
      </div>

      <div className="advice">
        <strong>💡 Tip</strong>
        Weigh your jar before feeding (with or without lid, just be consistent). Enter that number above and you'll know exactly how much starter you're working with — useful for scaling recipes or making sure you have enough for a bake.
      </div>
    </main>
  )
}

// ─── Inline Feedback Component ────────────────────────────────────────────────
function InlineFeedback({ obs, onDismiss, setTab }) {
  const feedback = {
    liquid: {
      icon: '💧',
      title: 'Hooch (liquid on top) — totally normal',
      color: '#4a7c9e',
      tips: [
        'Safe to stir back in or pour off — either is fine.',
        'Hooch = your starter is hungry. Feed it soon.',
        'If it\'s very sour-smelling, do a full Starter Refresh.',
        'Happens more in warm weather or if feeding intervals are too long.',
      ],
      action: null,
    },
    'no-activity': {
      icon: '😴',
      title: 'No activity — let\'s troubleshoot',
      color: '#b84c2a',
      tips: [
        'Give it more time — some starters take 8–12 hrs in cooler kitchens.',
        'Check your kitchen temperature (see guide below).',
        'Try a Starter Refresh — two feedings without discarding often wakes it up.',
        'Stir in ½ tsp sugar per 100g of starter to boost yeast activity.',
        'Switch to bread flour for a few feedings if using all-purpose.',
      ],
      action: 'refresh',
    },
    falling: {
      icon: '📉',
      title: 'Starter is falling — time to act',
      color: '#7a5c3a',
      tips: [
        'Falling = it has peaked and is now past its window. Feed it now if you haven\'t.',
        'If you needed it for baking, it may still work but activity is declining.',
        'For daily feeding: discard half and feed 1:1:1 right away.',
        'Consistent falling before reaching 2× rise = needs more frequent feedings or warmer spot.',
      ],
      action: null,
    },
    'no-double': {
      icon: '😕',
      title: "Didn't double — here's what to check",
      color: '#8a6a2a',
      tips: [
        'Most common cause: temperature. Below 70°F slows rise significantly — find a warmer spot.',
        'Give it more time — some starters take 10–12 hrs in cooler kitchens.',
        'Check your water — chlorinated tap water can inhibit yeast. Try filtered water.',
        'Try bread flour for a few feedings if you\'ve been using all-purpose.',
        'If it hasn\'t doubled after 12+ hrs in a warm spot, do a full Starter Refresh.',
        'Stir in ½ tsp sugar per 100g of starter to give the yeast a short-term boost.',
      ],
      action: 'refresh',
    },
  }

  const f = feedback[obs]
  if (!f) return null

  return (
    <div style={{background:'var(--warm)',border:`2px solid ${f.color}`,borderLeft:`4px solid ${f.color}`,padding:'1.2rem 1.5rem',marginBottom:'1.5rem',position:'relative'}}>
      <button onClick={onDismiss} style={{position:'absolute',top:'.6rem',right:'.8rem',background:'none',border:'none',color:'var(--mid)',cursor:'pointer',fontSize:'1rem',lineHeight:1}}>✕</button>
      <div style={{fontFamily:'Playfair Display,serif',fontSize:'1rem',fontWeight:700,marginBottom:'.8rem',color:'var(--dark)'}}>
        {f.icon} {f.title}
      </div>
      <ul style={{listStyle:'none',margin:'0 0 .8rem',padding:0}}>
        {f.tips.map((tip, i) => (
          <li key={i} style={{fontSize:'.78rem',lineHeight:1.6,padding:'.25rem 0',borderBottom:'1px solid var(--tan)',display:'flex',gap:'.6rem'}}>
            <span style={{color:f.color,flexShrink:0}}>→</span>{tip}
          </li>
        ))}
      </ul>
      <div style={{display:'flex',gap:'.8rem',flexWrap:'wrap',marginTop:'.6rem'}}>
        {f.action === 'refresh' && (
          <span style={{fontSize:'.68rem',background:'var(--brown)',color:'var(--cream)',padding:'.3rem .7rem',cursor:'pointer',letterSpacing:'.08em'}}
            onClick={() => { onDismiss(); }}>
            → Switch to Starter Refresh mode
          </span>
        )}
        <span style={{fontSize:'.68rem',background:'none',border:'1px solid var(--mid)',color:'var(--mid)',padding:'.3rem .7rem',cursor:'pointer',letterSpacing:'.08em'}}
          onClick={() => { onDismiss(); setTab('troubleshoot'); }}>
          Full troubleshooting guide →
        </span>
      </div>
    </div>
  )
}

// ─── Troubleshoot Tab ─────────────────────────────────────────────────────────
function TroubleshootTab({ setTab }) {
  const [open, setOpen] = useState(null)

  const items = [
    {
      id: 'hooch',
      icon: '💧',
      title: 'Liquid on top of starter (hooch)?',
      body: `
        <p>If you see liquid — also called hooch — developing on top of the starter, it's safe. You can stir it back in or pour it off, then proceed with feeding as normal.</p>
        <p>Hooch means your starter is hungry. If it's very sour-smelling or you've been neglecting it for a while, do a full <strong>Starter Refresh</strong> rather than a regular feed.</p>
      `
    },
    {
      id: 'slow',
      icon: '😴',
      title: 'Activity slowing down or trouble getting started?',
      body: `
        <p>You've been feeding your starter but it's not getting active like it used to — or you're rehydrating and it's not responding. A <strong>Starter Refresh</strong> can help immensely. Putting it in a clean container while thoroughly cleaning the old one also helps.</p>
        <p>Check the temperature in your home — this is the most common cause:</p>
        <ul>
          <li><strong>Under 60°F</strong> — Feed once or twice a day. Activity will be slow.</li>
          <li><strong>60–70°F</strong> — Feed at least twice a day, up to three times if needed.</li>
          <li><strong>70–80°F</strong> — Feed three to four times a day. Most active range.</li>
          <li><strong>Over 80°F</strong> — Activity slows again. Move to a cooler spot if possible. Feed at least 4× a day.</li>
        </ul>
        <p>If that's too much feeding, move it to the fridge (feed once or twice a week). If activity slows after fridge storage, feed more frequently for a few days to wake it back up.</p>
        <p>Last resort: stir in ½ tsp sugar per 100g of starter, switch to bread flour for a few feedings, and keep it on the counter in a warm spot for a few days.</p>
      `
    },
    {
      id: 'discolor',
      icon: '🎨',
      title: 'Discoloration?',
      body: `
        <p>If you see <strong>mold</strong> (fuzzy growth, unusual colors like pink, orange, or black) after storing too long without feeding — do not continue using the starter. Reach out to Sarver Farms and we can send you another for a discount. Mold is the one thing a Starter Refresh will not fix.</p>
        <p>Other discolorations can happen from not feeding enough. Gray or dark streaks are usually just oxidation and are fine — stir them in and feed. We're working on getting pictures up as examples.</p>
      `
    },
    {
      id: 'temp',
      icon: '🌡️',
      title: 'Feeding frequency by temperature',
      body: `
        <table style="width:100%;border-collapse:collapse;font-size:.78rem;margin-top:.5rem">
          <thead>
            <tr style="background:#3a2a15">
              <th style="padding:.5rem .8rem;text-align:left;color:var(--gold);font-weight:700">Temperature</th>
              <th style="padding:.5rem .8rem;text-align:left;color:var(--gold);font-weight:700">Feeds per day</th>
              <th style="padding:.5rem .8rem;text-align:left;color:var(--gold);font-weight:700">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #3a2a15"><td style="padding:.5rem .8rem">Under 60°F</td><td style="padding:.5rem .8rem">1–2×</td><td style="padding:.5rem .8rem">Slower activity, be patient</td></tr>
            <tr style="border-bottom:1px solid #3a2a15;background:#2a1e0e"><td style="padding:.5rem .8rem">60–70°F</td><td style="padding:.5rem .8rem">2–3×</td><td style="padding:.5rem .8rem">Good range, watch activity</td></tr>
            <tr style="border-bottom:1px solid #3a2a15"><td style="padding:.5rem .8rem">70–80°F</td><td style="padding:.5rem .8rem">3–4×</td><td style="padding:.5rem .8rem">Most active, peak baking range</td></tr>
            <tr style="background:#2a1e0e"><td style="padding:.5rem .8rem">Over 80°F</td><td style="padding:.5rem .8rem">4×+</td><td style="padding:.5rem .8rem">Move to cooler spot if possible</td></tr>
          </tbody>
        </table>
        <p style="margin-top:.8rem">Fridge storage: feed once or twice a week. If activity slows after fridge time, feed more often for a few days on the counter.</p>
      `
    },
    {
      id: 'contact',
      icon: '📬',
      title: 'Nothing is working — contact Sarver Farms',
      body: `
        <p>Sarver Farms starter is a buy-once-for-life product. If your starter seems truly dead after going through the Starter Refresh steps — no activity whatsoever after 2–3 refresh cycles — reach out. We'll send you a new one for free or at a discount.</p>
        <p>Yeast can sometimes get killed through extreme heat, contamination, or other factors outside your control. It's rare but it happens, and we want everyone to have a thriving starter.</p>
      `
    },
  ]

  return (
    <main className="page">
      <div className="r-intro">
        <h2>🔧 Troubleshooting & Common Issues</h2>
        <p>Something off with your starter? Most issues are easy to fix. Tap any topic below for guidance — or switch to the Starter Tracker and log what you're seeing for a tailored suggestion.</p>
      </div>

      {/* Quick links */}
      <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',marginBottom:'1.5rem'}}>
        {items.map(item => (
          <button key={item.id} onClick={() => setOpen(open === item.id ? null : item.id)}
            style={{background:open===item.id?'var(--brown)':'var(--warm)',border:`2px solid ${open===item.id?'var(--brown)':'var(--tan)'}`,color:open===item.id?'var(--cream)':'var(--dark)',padding:'.4rem .9rem',fontFamily:'Courier Prime,monospace',fontSize:'.68rem',letterSpacing:'.08em',cursor:'pointer',transition:'all .2s'}}>
            {item.icon} {item.title.split('?')[0].split('(')[0].trim()}
          </button>
        ))}
      </div>

      {/* Accordion items */}
      {items.map(item => (
        <div key={item.id} style={{background:'var(--warm)',border:`2px solid ${open===item.id?'var(--brown)':'var(--tan)'}`,marginBottom:'.6rem',transition:'border-color .2s'}}>
          <div onClick={() => setOpen(open === item.id ? null : item.id)}
            style={{padding:'1rem 1.2rem',display:'flex',alignItems:'center',gap:'1rem',cursor:'pointer'}}>
            <span style={{fontSize:'1.3rem',flexShrink:0}}>{item.icon}</span>
            <span style={{fontFamily:'Playfair Display,serif',fontSize:'1rem',fontWeight:700,flex:1}}>{item.title}</span>
            <span style={{color:'var(--mid)',fontSize:'.8rem',transition:'transform .2s',transform:open===item.id?'rotate(90deg)':'none'}}>▶</span>
          </div>
          {open === item.id && (
            <div style={{padding:'0 1.2rem 1.2rem',borderTop:'1px solid var(--tan)',fontSize:'.8rem',lineHeight:1.7,color:'#5a4030'}}
              dangerouslySetInnerHTML={{__html: item.body}} />
          )}
        </div>
      ))}

      <div style={{textAlign:'center',marginTop:'1.5rem'}}>
        <button onClick={() => setTab('tracker')}
          style={{background:'var(--brown)',color:'var(--cream)',border:'none',padding:'.6rem 1.4rem',fontFamily:'Courier Prime,monospace',fontSize:'.8rem',letterSpacing:'.1em',textTransform:'uppercase',cursor:'pointer'}}>
          ← Back to Starter Tracker
        </button>
      </div>
    </main>
  )
}

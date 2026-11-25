/** Sample note HTML for the dev-only layout harnesses. */

const PARA =
  "Gradient descent updates each parameter in the direction that most steeply reduces the loss. " +
  "The learning rate controls the step size: too large and the updates overshoot the minimum, too small and training crawls. " +
  "Momentum keeps a running average of past gradients, which smooths noisy updates and speeds progress along shallow valleys.";

export const SAMPLE_HTML = `
<h1>Optimization Basics</h1>
<p>${PARA}</p>
<h2>Learning rate schedules</h2>
<p>${PARA} ${PARA}</p>
<ul>
  <li>Step decay divides the rate by a constant every few epochs.</li>
  <li>Cosine annealing lowers it smoothly to near zero, then optionally restarts.</li>
  <li>Warmup starts small so early, noisy gradients don't destabilize training.</li>
</ul>
<div class="callout"><span class="callout-icon">💡</span><div class="callout-body">${PARA}</div></div>
<div class="process-flow"><h4>Training loop</h4><div class="flow-steps">
  <div class="flow-step"><strong>1. Forward</strong><p>Compute predictions and the loss.</p></div>
  <div class="flow-step highlighted"><strong>2. Backward</strong><p>Backpropagate to get gradients.</p></div>
  <div class="flow-step"><strong>3. Update</strong><p>Apply the optimizer step.</p></div>
</div></div>
${Array.from({ length: 8 }, (_, i) => `<h3>Section ${i + 1}</h3><p>${PARA}</p><p>${PARA}</p>`).join("\n")}
<pre><code>for x, y in loader:
    loss = criterion(model(x), y)
    loss.backward()
    optimizer.step()</code></pre>
<p>${PARA}</p>
`;

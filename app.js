const scrapeBtn = document.getElementById('scrapeBtn');
const optimizeBtn = document.getElementById('optimizeBtn');
const copyBtn = document.getElementById('copyBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const cvFileInput = document.getElementById('cvFile');

const jobUrlInput = document.getElementById('jobUrl');
const jobDescriptionInput = document.getElementById('jobDescription');
const cvTextInput = document.getElementById('cvText');
const optimizedCvInput = document.getElementById('optimizedCv');
const metricsEl = document.getElementById('metrics');

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'you', 'with', 'that', 'have', 'this', 'your', 'from', 'will', 'are',
  'our', 'all', 'who', 'not', 'but', 'can', 'job', 'work', 'team', 'role', 'years', 'plus'
]);

scrapeBtn.addEventListener('click', async () => {
  const jobUrl = jobUrlInput.value.trim();
  if (!jobUrl) {
    setMetrics('Add a job URL first.');
    return;
  }

  setMetrics('Trying to fetch the job description...');

  try {
    const proxyUrl = `https://r.jina.ai/http://${jobUrl.replace(/^https?:\/\//, '')}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const rawText = await response.text();
    const cleaned = rawText
      .split('\n')
      .filter((line) => !line.startsWith('Title:') && !line.startsWith('URL Source:'))
      .join('\n')
      .trim();

    if (!cleaned) {
      throw new Error('No readable content returned');
    }

    jobDescriptionInput.value = cleaned;
    setMetrics('Job description fetched. Review and edit before optimizing.');
  } catch (error) {
    setMetrics('Could not scrape this URL. Paste the description manually and continue.');
  }
});

cvFileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const text = await file.text();
  cvTextInput.value = text;
  setMetrics(`Loaded CV file: ${file.name}`);
});

loadSampleBtn.addEventListener('click', () => {
  cvTextInput.value = `Alex Morgan\nProduct Designer\n\nExperience\n- Led mobile app redesign that improved activation by 18%.\n- Worked closely with engineering and product teams on roadmap planning.\n- Conducted user interviews and usability tests across 4 releases.\n\nSkills\nFigma, user research, prototyping, design systems, collaboration`;
  setMetrics('Sample CV loaded.');
});

optimizeBtn.addEventListener('click', () => {
  const jobDescription = jobDescriptionInput.value.trim();
  const cvText = cvTextInput.value.trim();

  if (!jobDescription || !cvText) {
    setMetrics('Add both job description and CV text to optimize.');
    return;
  }

  const topKeywords = getTopKeywords(jobDescription, 16);
  const cvKeywords = new Set(tokenize(cvText));
  const matched = topKeywords.filter((word) => cvKeywords.has(word));
  const missing = topKeywords.filter((word) => !cvKeywords.has(word));

  const matchScore = Math.round((matched.length / Math.max(topKeywords.length, 1)) * 100);
  setMetrics(`Match score: ${matchScore}% · Matched: ${matched.join(', ') || 'none yet'}`);

  optimizedCvInput.value = buildOptimizedCv(cvText, matched, missing);
});

copyBtn.addEventListener('click', async () => {
  const text = optimizedCvInput.value.trim();
  if (!text) {
    setMetrics('Nothing to copy yet.');
    return;
  }

  await navigator.clipboard.writeText(text);
  setMetrics('Optimized CV copied to clipboard.');
});

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function getTopKeywords(text, limit = 12) {
  const counts = new Map();

  for (const word of tokenize(text)) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function buildOptimizedCv(cvText, matched, missing) {
  const missingPreview = missing.slice(0, 8).join(', ') || 'No major keyword gaps found.';

  const targetedSummary = [
    'Targeted Summary',
    `Results-driven candidate aligned with: ${matched.slice(0, 8).join(', ') || 'core role needs'}.`,
    'Focused on measurable impact, collaboration, and delivery quality.'
  ].join('\n');

  const suggestedBullets = missing.slice(0, 4).map((keyword) => `- Highlight a concrete result related to ${keyword}.`);

  return [
    targetedSummary,
    '',
    'Keyword Gaps to Address',
    missingPreview,
    '',
    'Suggested Improvements',
    ...(suggestedBullets.length ? suggestedBullets : ['- Keep current bullet points and add more metrics.']),
    '',
    'Original CV',
    cvText
  ].join('\n');
}

function setMetrics(message) {
  metricsEl.textContent = message;
}

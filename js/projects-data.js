// Site content for index.html. Everything on the page is rendered from here,
// so adding a project or skill is a data edit — no markup changes needed.

// Flip to true to show the "Open to work" chip in the hero.
const SITE = {
  openToWork: false
};

// Category ids used by PROJECTS. A filter chip appears automatically for each
// category that has at least one project; unused ones never show.
const CATEGORIES = {
  'sports': 'Sports',
  'full-stack': 'Full-stack',
  'front-end': 'Front-end',
  'tools': 'Tools'
};

// Shown in this order (put newest first). Optional fields:
//   image          — card thumbnail; without one the card shows initials
//   imagePosition  — CSS object-position for the thumbnail crop
//   initials       — override the auto-generated initials
const PROJECTS = [
  {
    title: 'Fantasy Football Dashboard',
    category: 'sports',
    stack: ['React', 'Vite', 'Python', 'SQLite', 'GitHub Actions'],
    description: 'How every NFL defense holds up against QBs, RBs, WRs and TEs, with stats refreshed weekly.',
    image: 'img/fantasy-football-dashboard.jpg',
    imagePosition: 'left top',
    url: 'https://joaquinvargas.me/fantasy-football-dashboard/',
    external: true
  },
  {
    title: 'Hydro Flask: Colors of Kona',
    category: 'front-end',
    stack: ['Bootstrap 5', 'HTML/CSS'],
    description: 'Product-launch landing page mockup for a new Hydro Flask color line.',
    image: 'hydroflask/images/KonaMobile.png',
    imagePosition: 'center 70%',
    url: 'hydroflask/hydroflask.html',
    external: false
  },
  {
    title: 'CSV/TSV Feed Filter',
    initials: 'FF',
    category: 'tools',
    stack: ['JavaScript'],
    description: 'Client-side tool for converting delimited feeds and exporting chosen columns.',
    image: null,
    url: 'feedFilter/feedFilter.html',
    external: false
  }
];

// `color` is one of the accent tokens defined in css/style.css.
const SKILLS = [
  { label: 'Front-end', color: 'green', items: ['HTML5', 'CSS3', 'Bootstrap', 'JavaScript', 'jQuery', 'React', 'Redux', 'PUG', 'Angular'] },
  { label: 'Back-end', color: 'purple', items: ['Node.js', 'Express', 'PostgreSQL', 'Sequelize', 'Passport', 'MongoDB'] },
  { label: 'Tools', color: 'orange', items: ['GitHub', 'Shopify', 'RetailPro', 'Adobe Photoshop', 'Monetate', 'Kibo', 'ContentStack'] }
];

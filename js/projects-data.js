// Personal projects shown in the #portfolio-grid section of index.html.
// Add a project by adding an object here — no markup changes needed.
const PROJECTS = [
  {
    title: 'Kool Journal',
    category: 'full-stack',
    stack: ['Express', 'PostgreSQL', 'Passport', 'PUG'],
    description: 'A full-stack journaling app with user authentication and persistent entries.',
    image: 'img/youtube_profile_image.png',
    url: 'https://kool-journal.herokuapp.com/login',
    external: true
  },
  {
    title: 'Game Catalog',
    category: 'front-end',
    stack: ['APIs', 'JavaScript', 'jQuery', 'Bootstrap'],
    description: 'A browsable catalog of video games built against a public games API.',
    image: null,
    url: 'https://thegamecat-1e92e.web.app/',
    external: true
  },
  {
    title: 'Hydro Flask: Colors of Kona',
    category: 'front-end',
    stack: ['Bootstrap 5', 'HTML/CSS'],
    description: 'A seasonal product-launch landing page mockup for a new Hydro Flask color line.',
    image: 'Images/KonaMobile.png',
    url: 'hydroflask.html',
    external: false
  },
  {
    title: 'CSV/TSV Feed Filter',
    category: 'tools',
    stack: ['JavaScript'],
    description: 'A client-side tool for converting delimited data feeds and exporting a chosen set of columns.',
    image: null,
    url: 'feedFilter/feedFilter.html',
    external: false
  }
];

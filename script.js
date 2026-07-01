// Scroll animations
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

  // Nav shrink
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('nav');
    if (window.scrollY > 60) {
      nav.style.padding = '1rem 4rem'; nav.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
    } else {
      nav.style.padding = '1.5rem 4rem'; nav.style.boxShadow = 'none';
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  CONTACT FORM — Formspree delivery
  //  Submits silently in the background (no email
  //  client opens) and forwards straight to
  //  thedevagency3@gmail.com.
  //
  //  SETUP (one-time, ~2 minutes):
  //  1. Go to https://formspree.io and sign up free
  //     using thedevagency3@gmail.com.
  //  2. Create a new form → it gives you an endpoint
  //     like https://formspree.io/f/abcdwxyz
  //  3. Formspree emails thedevagency3@gmail.com a
  //     confirmation link — click it to activate.
  //  4. Paste your endpoint below, replacing
  //     'YOUR_FORMSPREE_ENDPOINT'.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xwvdrylz';

  // Form validation helper
  function validateForm() {
    const fname   = document.getElementById('fname').value.trim();
    const lname   = document.getElementById('lname').value.trim();
    const email   = document.getElementById('email').value.trim();
    const service = document.getElementById('service').value;
    const budget  = document.getElementById('budget').value.trim();
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!fname)              return 'Please enter your first name.';
    if (!lname)              return 'Please enter your last name.';
    if (!email)              return 'Please enter your email address.';
    if (!emailRx.test(email)) return 'Please enter a valid email address.';
    if (!service)            return 'Please select a service.';
    if (!budget)             return 'Please type in your budget.';
    return null;
  }

  // Submit handler
  async function handleSubmit(e) {
    e.preventDefault();

    const btn       = document.getElementById('submitBtn');
    const submitTxt = document.getElementById('submitText');
    const arrow     = document.getElementById('submitArrow');
    const spinner   = document.getElementById('submitSpinner');
    const success   = document.getElementById('formSuccess');
    const errorBox  = document.getElementById('formError');
    const errorMsg  = document.getElementById('formErrorMsg');

    // Reset feedback
    success.style.display  = 'none';
    errorBox.style.display = 'none';

    // Validate
    const validationError = validateForm();
    if (validationError) {
      errorMsg.textContent   = validationError;
      errorBox.style.display = 'block';
      return;
    }

    // Loading state
    btn.disabled           = true;
    submitTxt.textContent  = 'Sending…';
    arrow.style.display    = 'none';
    spinner.style.display  = 'block';

    const fname   = document.getElementById('fname').value.trim();
    const lname   = document.getElementById('lname').value.trim();
    const email   = document.getElementById('email').value.trim();
    const service = document.getElementById('service').value;
    const budget  = document.getElementById('budget').value.trim();
    const message = document.getElementById('message').value.trim();

    const payload = {
      _subject : 'New Enquiry from ' + fname + ' ' + lname + ' — ' + service,
      name     : fname + ' ' + lname,
      email    : email,
      service  : service,
      budget   : budget,
      message  : message || 'No additional message provided.',
    };

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body    : JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data.errors && data.errors.map(x => x.message).join(', ')) || 'Submission failed.');
      }

      // Success — submitted silently in the background
      success.style.display = 'block';
      document.getElementById('quoteForm').reset();

    } catch (err) {
      console.error('Form submission error:', err);
      errorMsg.textContent   = 'Something went wrong. Please try again or email us directly at thedevagency3@gmail.com.';
      errorBox.style.display = 'block';

    } finally {
      // Restore button
      btn.disabled          = false;
      submitTxt.textContent = 'Send My Enquiry';
      arrow.style.display   = 'block';
      spinner.style.display = 'none';
    }
  }


  // ── SERVICE MODAL DATA ──
  const WA_NUMBER = '233507593896'; // Primary WhatsApp number

  const serviceData = [
    {
      num: '01',
      title: 'Website Design & Development',
      tagline: 'Your digital storefront — built to convert.',
      body: 'We craft custom, pixel-perfect websites that don\'t just look great — they work hard for your business. Every site we build is fast, mobile-first, SEO-ready, and designed to turn visitors into paying customers. No templates. No shortcuts. Just premium, hand-coded sites built to last.',
      features: [
        'Custom design tailored to your brand & audience',
        'Mobile-first, fully responsive across all devices',
        'Fast load times with performance optimisation',
        'SEO-ready structure & semantic HTML',
        'CMS integration (WordPress, Webflow, or custom)',
        'Conversion-optimised layout & call-to-action design',
        'Contact forms, booking systems & third-party integrations',
        '30-day post-launch support included',
      ],
    },
    {
      num: '02',
      title: 'Brand Identity Design',
      tagline: 'Stand out. Be remembered. Build trust instantly.',
      body: 'Your brand is more than a logo — it\'s the total impression you leave on every customer. We build cohesive brand identities that communicate your values, attract your ideal clients, and make you look like the premium option in your market.',
      features: [
        'Logo design (primary, secondary & icon marks)',
        'Brand colour palette with hex, RGB & CMYK codes',
        'Typography system (heading + body font pairings)',
        'Brand voice & tone guidelines',
        'Business card, letterhead & stationery design',
        'Social media profile & cover templates',
        'Brand style guide document (PDF)',
        'All files delivered in print & digital formats',
      ],
    },
    {
      num: '03',
      title: 'SEO & Digital Strategy',
      tagline: 'Get found. Grow organically. Outrank your competition.',
      body: 'Ranking on Google isn\'t luck — it\'s a science. We audit your current online presence, research your competitors, identify high-value keyword opportunities, and build an actionable strategy that drives sustainable, organic growth month after month.',
      features: [
        'Full technical SEO audit of your current site',
        'Keyword research & competitive analysis',
        'On-page SEO optimisation (meta, headings, structure)',
        'Local SEO & Google Business Profile setup',
        'Content strategy & blog planning',
        'Backlink profile review & link-building plan',
        'Monthly performance reports (rankings, traffic, conversions)',
        'Ongoing strategy refinement based on data',
      ],
    },
    {
      num: '04',
      title: 'E-Commerce Solutions',
      tagline: 'Sell more. Abandon less. Scale faster.',
      body: 'We build powerful online stores designed to maximise every sale opportunity. From seamless checkout flows to inventory management and payment gateway integration — your store will be fast, secure, and built to handle growth.',
      features: [
        'Custom store design aligned with your brand',
        'Product catalogue setup & category structure',
        'Secure payment gateway integration (Stripe, PayStack, etc.)',
        'Mobile-optimised shopping experience',
        'Cart abandonment & recovery flows',
        'Inventory management & stock alerts',
        'Discount codes, upsells & cross-sells',
        'Order confirmation emails & post-purchase automations',
      ],
    },
    {
      num: '05',
      title: 'Ongoing Support & Care',
      tagline: 'We stay with you — long after launch day.',
      body: 'Websites need love and attention to stay healthy, secure, and high-performing. Our monthly care plans give you peace of mind: regular updates, security patches, performance checks, and a dedicated team ready to help whenever you need it.',
      features: [
        'Weekly site backups & restore capability',
        'Core, plugin & theme updates',
        'Security monitoring & malware protection',
        'Uptime monitoring with instant alerts',
        'Monthly performance & speed optimisation',
        'Content updates (text, images, pricing, etc.)',
        'Priority email & WhatsApp support',
        'Monthly report on site health & analytics',
      ],
    },
    {
      num: '06',
      title: 'Landing Page Optimisation',
      tagline: 'Turn more clicks into customers.',
      body: 'Every visitor who leaves without converting is lost revenue. We analyse your existing landing pages, identify friction points, and redesign or optimise them using proven conversion rate optimisation (CRO) techniques — so you get more from the traffic you already have.',
      features: [
        'Heatmap & behaviour analysis of current page',
        'A/B testing strategy & implementation',
        'Headline, copy & call-to-action optimisation',
        'Page speed & Core Web Vitals improvements',
        'Trust signal integration (testimonials, badges, reviews)',
        'Form simplification & lead capture optimisation',
        'Mobile experience audit & fixes',
        'Conversion rate benchmarking & reporting',
      ],
    },
  ];

  function buildWaLink(serviceName) {
    const msg = encodeURIComponent(
      `Hi The Dev Agency! 👋\n\nI visited your website and I'd like to request a quote for:\n\n*Service:* ${serviceName}\n\nCould you please share more details and pricing? Thank you!`
    );
    return `https://wa.me/${WA_NUMBER}?text=${msg}`;
  }

  function openServiceModal(index) {
    const s = serviceData[index];
    document.getElementById('smNum').textContent = s.num;
    document.getElementById('smTitle').textContent = s.title;
    document.getElementById('smTagline').textContent = s.tagline;
    document.getElementById('smBody').textContent = s.body;
    const ul = document.getElementById('smFeatures');
    ul.innerHTML = s.features.map(f => `<li>${f}</li>`).join('');
    document.getElementById('smCta').href = buildWaLink(s.title);
    document.getElementById('serviceModalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeServiceModal() {
    document.getElementById('serviceModalOverlay').classList.remove('active');
    document.body.style.overflow = '';
  }

  // Attach click handlers to service cards
  document.querySelectorAll('.service-card').forEach(function(card, i) {
    card.addEventListener('click', function() { openServiceModal(i); });
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Learn more about ' + serviceData[i].title);
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openServiceModal(i); }
    });
  });

  document.getElementById('serviceModalClose').addEventListener('click', closeServiceModal);
  document.getElementById('serviceModalOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeServiceModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeServiceModal();
  });


  const inner = document.getElementById('marquee-inner');
  inner.innerHTML += inner.innerHTML;

  // ── THEME — follows device/OS theme automatically ──
  (function() {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme(isDark) {
      if (isDark) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.removeAttribute('data-theme');
      }
    }

    // Set theme on load based on current device preference
    applyTheme(media.matches);

    // Live-update whenever the device theme is switched, no reload needed
    media.addEventListener('change', function(e) {
      applyTheme(e.matches);
    });
  })();

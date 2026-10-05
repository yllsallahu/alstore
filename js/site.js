/* AL STORE — shared header behaviour (mobile menu + current page marker) */
(function () {
  var header = document.querySelector('.site-header');
  var menuButton = document.querySelector('.menu-toggle');
  var navigation = document.querySelector('#navigation');
  if (!header || !menuButton || !navigation) return;

  var desktop = window.matchMedia('(min-width: 1200px)');

  function setOpen(open) {
    menuButton.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open && !desktop.matches);
  }

  function closeMenu() {
    if (menuButton.getAttribute('aria-expanded') === 'true') setOpen(false);
  }

  menuButton.addEventListener('click', function () {
    setOpen(menuButton.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });

  document.addEventListener('click', function (event) {
    if (!header.contains(event.target)) closeMenu();
  });

  navigation.addEventListener('click', function (event) {
    if (event.target.closest('a')) closeMenu();
  });

  if (desktop.addEventListener) desktop.addEventListener('change', closeMenu);
  else if (desktop.addListener) desktop.addListener(closeMenu);

  // Mark the link that matches the current page.
  function normalize(path) {
    return path.toLowerCase().replace(/index\.html$/, '').replace(/([^/])$/, '$1/');
  }
  var current = normalize(window.location.pathname);
  navigation.querySelectorAll('.nav-list a').forEach(function (link) {
    var isSamePage = !link.hash && link.origin === window.location.origin && normalize(link.pathname) === current;
    if (isSamePage) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
})();

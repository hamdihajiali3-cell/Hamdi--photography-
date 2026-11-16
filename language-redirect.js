(() => {
  const destination = new URL('./tr/', location.href);
  destination.search = location.search;
  destination.hash = location.hash;
  location.replace(destination.href);
})();

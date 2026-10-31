// Applies the saved theme before first paint (no flash). Loaded as a blocking classic script.
(function () {
  var dark = true
  try { dark = localStorage.getItem('umc:theme') !== '"light"' } catch (e) {}
  if (dark) document.documentElement.classList.add('dark')
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#120e0b' : '#faf7f2')
})()

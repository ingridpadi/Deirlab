fetch("header.html")
    .then(respuesta => respuesta.text())
    .then(datos => {
        document.getElementById("header").innerHTML = datos;
    });
 
fetch("footer.html")
    .then(respuesta => respuesta.text())
    .then(datos => {
        document.getElementById("footer").innerHTML = datos;
    });

    document.querySelectorAll('.accordion__item').forEach(item => {
  item.addEventListener('toggle', (e) => {
    if (item.open) {
      document.querySelectorAll('.accordion__item').forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.removeAttribute('open');
        }
      });
    }
  });
});
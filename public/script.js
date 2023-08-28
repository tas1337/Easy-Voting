window.onload = function() {
  fetch('/results')
  .then(response => response.json())
  .then(data => {
    let table = "<table><tr><th>Vote</th><th>Count</th></tr>";
    data.forEach(row => {
      table += `<tr><td>${row.vote}</td><td>${row.count}</td></tr>`;
    });
    table += "</table>";
    document.getElementById("results").innerHTML = table;
  });
}
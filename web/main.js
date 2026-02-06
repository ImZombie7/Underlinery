const gridEl = document.getElementById("grid");
const grid = initGrid();

let placementCount = 0;
let locked = false;

// render grid
for (let r = 0; r < 11; r++) {
  const row = document.createElement("div");

  for (let c = 0; c < 11; c++) {
    const cell = document.createElement("button");
    cell.style.width = "30px";
    cell.style.height = "30px";

    cell.addEventListener("click", () => {
      if (locked) return;

      const input = prompt("Enter number (1–121):");
      const number = Number(input);

      const success = placeNumber(grid, r, c, number);

      if (success) {
        cell.textContent = number;
        placementCount++;

        if (placementCount === 121) {
          locked = true;
          console.log("PLACEMENT COMPLETE");
        }
      } else {
        console.log("invalid placement");
      }
    });

    row.appendChild(cell);
  }

  gridEl.appendChild(row);
}

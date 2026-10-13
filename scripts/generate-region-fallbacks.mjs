// Original abstract themes. Official scenery pending replacement; these are never geographic maps.
// 纪念山地背景图待替换为官方宣传图；九份SVG也用于图片失败兜底，绝非真实地图。
import fs from "node:fs";
const regions = JSON.parse(
  fs.readFileSync("data/input/region-banners.json"),
).regions;
const motifs = {
  florawish:
    '<g fill="#f0ddd5"><path d="M770 370V232h110v138zM910 370V175h100v195zM1050 370V250h145v120z"/><circle cx="1170" cy="170" r="70" fill="#dab1c1"/></g><path d="m750 238 76-70 74 70m-14-57 74-93 72 93" fill="none" stroke="#b489a0" stroke-width="8"/>',
  "breezy-meadow":
    '<g stroke="#eff5df" stroke-width="9"><path d="m990 340 18-150h55l18 150" fill="#dbdebb"/><path d="M1035 205v-95m0 95 90-35m-90 35-65 74m65-74-80-58"/><circle cx="1035" cy="205" r="12" fill="#f4edcc"/></g>',
  stoneville:
    '<g fill="#ac97c7"><path d="M680 380 730 200l80-20 70 200zm230 0 50-230 120-20 70 250zm240 0 50-200 150-20 50 220z"/></g><g fill="#e4d3ef"><path d="M720 275h80v48h-80zm270-70h80v50h-80z"/></g>',
  "abandoned-district":
    '<g fill="#9ba2b8"><path d="m650 195 220-25 120 40-145 60zm340-70 150-40 120 35-125 90zm120 175 215-20 100 50-175 80z"/></g><g stroke="#e4e9f5" stroke-width="3" opacity=".5"><path d="M860 280v70m275-125v55m85 140v35"/></g>',
  "wishing-woods":
    '<g fill="#528b85"><path d="M690 360V200h35v160zm270 0V130h35v230zm250 0V180h35v180z"/><ellipse cx="710" cy="165" rx="125" ry="110"/><ellipse cx="980" cy="120" rx="145" ry="110"/><ellipse cx="1230" cy="150" rx="120" ry="100"/></g><g fill="#d5eab0"><circle cx="880" cy="175" r="7"/><circle cx="1070" cy="215" r="5"/><circle cx="1220" cy="100" r="6"/></g>',
  "memorial-mountains":
    '<g fill="#bec9e2"><path d="M520 390 735 125l210 265zm280 0 270-345 240 345z"/></g><g fill="#eef2fa"><path d="m680 192 55-67 52 67-50-20zm320-60 70-87 64 86-64-30z"/></g><path d="M1010 335v-72m-20 20h40" stroke="#e9dfbe" stroke-width="9"/><circle cx="1260" cy="95" r="39" fill="#f8ead1"/>',
  "firework-isles":
    '<g stroke="#ffe1b0" stroke-width="4" fill="none"><path d="M945 60v65m-65-25 50 40m85-40-50 40m-110 15h60m115 0h60m-137 15-50 45m105-45 50 45"/><path d="M1210 100v60m-50-20 40 30m60-30-40 30m-75 15h45m40 0h45"/></g><g fill="#efb9ca"><circle cx="920" cy="260" r="25"/><circle cx="1120" cy="250" r="18"/></g>',
  "danqing-island":
    '<g fill="#7b9e9d" opacity=".8"><path d="M570 370 780 120l150 250zm220 0 240-300 205 300z"/></g><g fill="#4e7777"><path d="M1040 360V280h150v80z"/><path d="m1010 287 105-60 105 60-105-14zm20-62 85-50 80 50-80-13z"/></g>',
  itzaland:
    '<g fill="#bea372"><path d="M760 365V220h90v145zm200 0V135h100v230zm240 0V240h90v125z"/></g><g fill="#d9c99e"><ellipse cx="810" cy="220" rx="120" ry="40"/><ellipse cx="1010" cy="135" rx="125" ry="45"/><ellipse cx="1250" cy="240" rx="100" ry="35"/></g>',
};
for (const r of regions) {
  const [sky, hill, ink] = r.palette;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="480" viewBox="0 0 1440 480"><!-- Original theme illustration; not official scenery, not a map. --><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${sky}"/><stop offset="1" stop-color="${hill}"/></linearGradient></defs><rect width="1440" height="480" fill="url(#sky)"/><path d="M0 330Q270 195 600 330T1440 255V480H0Z" fill="${hill}"/>${motifs[r.slug]}<path d="M0 400Q430 310 750 400T1440 365V480H0Z" fill="${ink}" opacity=".38"/><g fill="#fff" opacity=".3"><circle cx="200" cy="110" r="7"/><circle cx="360" cy="185" r="4"/><circle cx="560" cy="75" r="5"/></g></svg>`;
  fs.writeFileSync("src/" + r.fallback_path, svg);
  if (r.image_kind === "placeholder")
    fs.writeFileSync("src/" + r.primary_path, svg);
}
console.log(
  "Generated nine distinct original SVG fallback themes; Memorial Mountains is explicitly an official-image placeholder.",
);

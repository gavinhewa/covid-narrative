let covidData;
let usData;
let latestData = {};
let colorScale;

const svg = d3.select("#chart");
let currentScene = "overview";

// Create a single persistent tooltip element on the body
const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "white")
    .style("padding", "10px")
    .style("border", "1px solid black")
    .style("border-radius", "4px")
    .style("pointer-events", "none"); // Prevents tooltip from interfering with mouse events

// 1. Load data asynchronously
Promise.all([
    d3.csv("data/covid.csv"),
    d3.json("data/us-states.json")
]).then(function(files) {
    covidData = files[0];
    usData = files[1];

    // 2. Process covidData into latestData lookup map
    covidData.forEach(function(d) {
        latestData[d.state] = {
            cases: +d.cases,
            deaths: +d.deaths
        };
    });

    // 3. Define a color scale now that data is loaded & max values are known
    const maxCases = d3.max(covidData, d => +d.cases) || 1000;
    colorScale = d3.scaleSequential()
        .domain([0, maxCases])
        .interpolator(d3.interpolateReds);

    const states = Object.entries(latestData).map(([state, values]) => ({
        state,
        cases: values.cases,
        deaths: values.deaths
    }));

    states.sort((a, b) => b.cases - a.cases);
    const top10 = states.slice(0, 10);

    // 4. Initial render once everything is ready
    renderScene();
});

function renderScene() {
    svg.selectAll("*").remove();

    if (currentScene === "overview") {
        drawOverview();
    } else if (currentScene === "cases") {
        drawCases();
    } else if (currentScene === "deaths") {
        drawDeaths();
    }
}

function drawOverview() {
    const states = topojson.feature(
        usData,
        usData.objects.states
    );

    const projection = d3.geoAlbersUsa()
        .fitSize([1000, 650], states);

    const path = d3.geoPath(projection);

    svg.selectAll("path")
        .data(states.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", function(d) {
            const stateName = d.properties.name;
            const stateRecord = latestData[stateName];
            return stateRecord ? colorScale(stateRecord.cases) : "#ccc";
        })
        .attr("stroke", "white")
        .on("mouseover", function(event, d) {
            const stateName = d.properties.name;
            const stateRecord = latestData[stateName];
            const casesCount = stateRecord ? stateRecord.cases : "N/A";

            tooltip
                .style("visibility", "visible")
                .html(`<strong>${stateName}</strong><br>Cases: ${casesCount}`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
        });
}

function drawCases() {
    svg.append("text")
        .attr("x", 350)
        .attr("y", 100)
        .attr("font-size", 30)
        .text("Cases Scene");
}

function drawDeaths() {
    svg.append("text")
        .attr("x", 350)
        .attr("y", 100)
        .attr("font-size", 30)
        .text("Deaths Scene");
}

// Event Listeners for Navigation Buttons
d3.select("#overviewBtn").on("click", function() {
    currentScene = "overview";
    renderScene();
});

d3.select("#casesBtn").on("click", function() {
    currentScene = "cases";
    renderScene();
});

d3.select("#deathsBtn").on("click", function() {
    currentScene = "deaths";
    renderScene();
});
let covidData;
let usData;
let latestData = {};
let colorScale;
let top10Cases = [];
let top10Deaths = [];

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
    .style("pointer-events", "none");

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

    const statesArray = Object.entries(latestData).map(([state, values]) => ({
        state,
        cases: values.cases,
        deaths: values.deaths
    }));

    // Generate Top 10 Lists for Cases and Deaths
    top10Cases = [...statesArray].sort((a, b) => b.cases - a.cases).slice(0, 10);
    top10Deaths = [...statesArray].sort((a, b) => b.deaths - a.deaths).slice(0, 10);

    // 4. Initial render once everything is ready
    renderScene();
});

function renderScene() {
    svg.selectAll("*").remove();

    // Select and update the narrative caption container
    const captionBox = d3.select("#narrative-caption");

    if (currentScene === "overview") {
        captionBox.html("<strong>Overview:</strong> This map displays the cumulative geographic spread of COVID-19 cases across U.S. states. Darker shades of red represent higher case volumes.");
        drawOverview();
    } else if (currentScene === "cases") {
        captionBox.html("<strong>Deep Dive:</strong> Looking closer at the top 10 states by total cases. Populous states like California and Texas lead the count significantly.");
        drawCases();
    } else if (currentScene === "deaths") {
        captionBox.html("<strong>Impact Analysis:</strong> Examining the top 10 states by total deaths reveals how case volume correlates with mortality outcomes.");
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
    const margin = {top: 60, right: 40, bottom: 40, left: 120};
    const width = 1000 - margin.left - margin.right;
    const height = 650 - margin.top - margin.bottom;

    const chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Title
    svg.append("text")
        .attr("x", margin.left)
        .attr("y", 35)
        .attr("font-size", 22)
        .attr("font-weight", "bold")
        .text("Top 10 States by COVID-19 Cases");

    const yScale = d3.scaleBand()
        .domain(top10Cases.map(d => d.state))
        .range([0, height])
        .padding(0.1);

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(top10Cases, d => d.cases)])
        .range([0, width]);

    // Draw Bars
    chartGroup.selectAll("rect")
        .data(top10Cases)
        .enter()
        .append("rect")
        .attr("y", d => yScale(d.state))
        .attr("x", 0)
        .attr("height", yScale.bandwidth())
        .attr("width", d => xScale(d.cases))
        .attr("fill", "#d95f0e")
        .on("mouseover", function(event, d) {
            tooltip
                .style("visibility", "visible")
                .html(`<strong>${d.state}</strong><br>Cases: ${d.cases.toLocaleString()}`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
        });

    // Inside drawCases(), after drawing bars:
    const topState = top10Cases[0];

    chartGroup.append("text")
        .attr("x", xScale(topState.cases) - 10)
        .attr("y", yScale(topState.state) + (yScale.bandwidth() / 2))
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("fill", "white")
        .attr("font-weight", "bold")
        .text(`Highest: ${topState.state}`);

    // Axes
    chartGroup.append("g")
        .call(d3.axisLeft(yScale));

    chartGroup.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).ticks(5));
}

function drawDeaths() {
    const margin = {top: 60, right: 40, bottom: 40, left: 120};
    const width = 1000 - margin.left - margin.right;
    const height = 650 - margin.top - margin.bottom;

    const chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Title
    svg.append("text")
        .attr("x", margin.left)
        .attr("y", 35)
        .attr("font-size", 22)
        .attr("font-weight", "bold")
        .text("Top 10 States by COVID-19 Deaths");

    const yScale = d3.scaleBand()
        .domain(top10Deaths.map(d => d.state))
        .range([0, height])
        .padding(0.1);

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(top10Deaths, d => d.deaths)])
        .range([0, width]);

    // Draw Bars
    chartGroup.selectAll("rect")
        .data(top10Deaths)
        .enter()
        .append("rect")
        .attr("y", d => yScale(d.state))
        .attr("x", 0)
        .attr("height", yScale.bandwidth())
        .attr("width", d => xScale(d.deaths))
        .attr("fill", "#ae017e")
        .on("mouseover", function(event, d) {
            tooltip
                .style("visibility", "visible")
                .html(`<strong>${d.state}</strong><br>Deaths: ${d.deaths.toLocaleString()}`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
        });

    // Axes
    chartGroup.append("g")
        .call(d3.axisLeft(yScale));

    chartGroup.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).ticks(5));
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
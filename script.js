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

function drawAnnotation(group, x, y, title, subtitle, alignRight = false) {
    const boxWidth = 250; // Increased width to prevent text overflow
    const boxHeight = 55;
    // Adjust x position if aligning to the right of a data point
    const boxX = alignRight ? x + 15 : x - boxWidth - 15;
    const boxY = y - (boxHeight / 2);

    const annoGroup = group.append("g")
        .attr("class", "annotation-group");

    // Connecting line from data point to annotation box
    annoGroup.append("line")
        .attr("x1", x)
        .attr("y1", y)
        .attr("x2", alignRight ? boxX : boxX + boxWidth)
        .attr("y2", boxY + (boxHeight / 2))
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "2,2");

    // Background card for scannability
    annoGroup.append("rect")
        .attr("x", boxX)
        .attr("y", boxY)
        .attr("width", boxWidth)
        .attr("height", boxHeight)
        .attr("fill", "white")
        .attr("stroke", "#333")
        .attr("stroke-width", 1)
        .attr("rx", 4);

    // Title text (Bold, key messaging point)
    annoGroup.append("text")
        .attr("x", boxX + 12)
        .attr("y", boxY + 20)
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("fill", "#111")
        .text(title);

    // Subtitle text (Context/Data detail)
    annoGroup.append("text")
        .attr("x", boxX + 12)
        .attr("y", boxY + 38)
        .attr("font-size", "11px")
        .attr("fill", "#555")
        .text(subtitle);
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

    // --- STATIC TEMPLATE ANNOTATION FOR OVERVIEW ---
    // Find California (or another state feature) to anchor the annotation
    const targetStateFeature = states.features.find(d => d.properties.name === "California");
    
    if (targetStateFeature) {
        const centroid = path.centroid(targetStateFeature); // [x, y] pixel coordinates
        const topStateData = latestData["California"];

        drawAnnotation(
            svg, // Pass main svg since map isn't inside a translated chartGroup
            centroid[0], 
            centroid[1], 
            "Geographic Hotspot", 
            `California shows the highest overall case spread`, 
            true // Position box to the right of the point
        );
    }
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
        .attr("fill", "#d95f0e");

    // Axes
    chartGroup.append("g").call(d3.axisLeft(yScale));
    chartGroup.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(xScale).ticks(5));

    // --- STATIC TEMPLATE ANNOTATION ---
    const topState = top10Cases[0]; // e.g., California
    const targetX = xScale(topState.cases);
    const targetY = yScale(topState.state) + (yScale.bandwidth() / 2);

    drawAnnotation(
        chartGroup, 
        targetX, 
        targetY, 
        "Concentrated Burden", 
        `${topState.state} leads with ${topState.cases.toLocaleString()} cases`, 
        false // Position box to the left of the bar tip
    );
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
        .attr("fill", "#ae017e");

    // Axes
    chartGroup.append("g").call(d3.axisLeft(yScale));
    chartGroup.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(xScale).ticks(5));

    // --- STATIC TEMPLATE ANNOTATION FOR DEATHS ---
    const topDeathState = top10Deaths[0]; // e.g., California or New York depending on dataset
    const targetX = xScale(topDeathState.deaths);
    const targetY = yScale(topDeathState.state) + (yScale.bandwidth() / 2);

    drawAnnotation(
        chartGroup, 
        targetX, 
        targetY, 
        "Severe Mortality Impact", 
        `${topDeathState.state} leads with ${topDeathState.deaths.toLocaleString()} deaths`, 
        false // Position box to the left of the bar tip
    );
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
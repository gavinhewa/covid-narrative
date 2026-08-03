let covidData;
let usData;

Promise.all([

    d3.csv("data/covid.csv"),

    d3.json("data/us-states.json")

]).then(function(data){

    covidData=data[0];

    usData=data[1];

    renderScene();

});

const latestData = {};

data.forEach(function(d){

    latestData[d.state] = {
        cases: +d.cases,
        deaths: +d.deaths
    };

});

const svg = d3.select("#chart");

let currentScene = "overview";

renderScene();

function renderScene(){

    svg.selectAll("*").remove();

    if(currentScene==="overview"){
        drawOverview();
    }

    if(currentScene==="cases"){
        drawCases();
    }

    if(currentScene==="deaths"){
        drawDeaths();
    }

}

function drawOverview(){

    const states = topojson.feature(
        usData,
        usData.objects.states
    );

    const projection = d3.geoAlbersUsa()
        .fitSize([1000,650],states);

    const path = d3.geoPath(projection);

    svg.selectAll("path")
        .data(states.features)
        .enter()
        .append("path")
        .attr("d",path)
        .attr("fill", function(d){

            return colorScale(
                latestData[d.properties.name].cases
            );

        })
        .attr("stroke","white");

}

function drawCases(){

    svg.append("text")
        .attr("x",350)
        .attr("y",100)
        .attr("font-size",30)
        .text("Cases Scene");

}

function drawDeaths(){

    svg.append("text")
        .attr("x",350)
        .attr("y",100)
        .attr("font-size",30)
        .text("Deaths Scene");

}

d3.select("#overviewBtn")
    .on("click", function(){

        currentScene="overview";

        renderScene();

    });

d3.select("#casesBtn")
    .on("click", function(){

        currentScene="cases";

        renderScene();

    });

d3.select("#deathsBtn")
    .on("click", function(){

        currentScene="deaths";

        renderScene();

    });
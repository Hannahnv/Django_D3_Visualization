// Q2.js: Vẽ biểu đồ doanh số theo nhóm hàng
export function render(data) {
    console.log("Dữ liệu Q2:", data);

    d3.select("#chart-container").html("");

    const width = 700, height = 400, margin = { top: 50, right: 160, bottom: 50, left: 200 };

    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("display", "block")
        .style("margin", "0 auto")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("visibility", "hidden")
        .style("font-family", "Arial, sans-serif");

    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.total)]).range([0, width]);
    const y = d3.scaleBand().domain(data.map(d => `[${d.groupCode}] ${d.groupName}`)).range([0, height]).padding(0.2);
    const color = d3.scaleOrdinal().domain(data.map(d => d.groupCode)).range(d3.schemeTableau10);

    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("y", d => y(`[${d.groupCode}] ${d.groupName}`))
        .attr("width", d => x(d.total))
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.groupCode))
        .on("mouseover", function (event, d) {
            tooltip.style("visibility", "visible")
                .html(`
                    <strong>Nhóm hàng:</strong> [${d.groupCode}] ${d.groupName}<br>
                    <strong>Doanh số:</strong> ${d3.format(",")(d.total)} VND
                `);
        })
        .on("mousemove", function (event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
        });


    svg.selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("x", d => x(d.total) + 5)
        .attr("y", d => y(`[${d.groupCode}] ${d.groupName}`) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .text(d => {
            const value = d.total;
            if (value >= 1e9) {
                return `${(value / 1e9).toFixed(1)} tỷ VND`;
            } else if (value >= 1e6) {
                return `${Math.round(value / 1e6)} triệu VND`; // Ví dụ: 626,000,000 => 626 triệu VND
            } else {
                return `${Math.round(value / 1e3)} nghìn VND`; // Ví dụ: 25,000 => 25 nghìn VND
            }
        });
        
    svg.append("g")
        .call(d3.axisLeft(y))
        .attr("font-size", "10px");

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(10).tickFormat(d => {
            if (d >= 1e6) {
                return `${d / 1e6}M`;
            } else {
                return d;
            }
        })); // Định dạng lại trục x để hiển thị triệu (M)
    
    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2) // Căn giữa theo chiều ngang của toàn bộ SVG
        .attr("y", -margin.top / 4) // Đặt tiêu đề phía trên biểu đồ
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text("Doanh số bán hàng theo Nhóm hàng");
}

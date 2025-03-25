export function render(data) {
    console.log("Dữ liệu Q6:", data);

    if (!data || data.length === 0) {
        console.error("Không có dữ liệu để vẽ biểu đồ.");
        return;
    }

    // Cấu hình kích thước biểu đồ
    const width = 900, height = 500, margin = { top: 60, right: 50, bottom: 50, left: 150 };

    // Tạo vùng vẽ SVG
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Thang đo
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.hour))
        .range([0, width])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.avgRevenue)])
        .nice()
        .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(data.map(d => d.hour))
        .range(d3.schemeTableau10);

    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("font-family", "Arial, sans-serif")
        .style("visibility", "hidden");

    // Vẽ các cột
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.hour))
        .attr("y", d => yScale(d.avgRevenue))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.avgRevenue))
        .attr("fill", d => colorScale(d.hour))
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible").html(`
                <strong>Khung giờ:</strong> ${String(d.hour).padStart(2, "0")}:00-${String(d.hour).padStart(2, "0")}:59<br>
                <strong>Doanh số bán TB:</strong> ${d3.format(",")(d.avgRevenue.toFixed(0))} VND
            `);
        })
        .on("mousemove", (event) => {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });

    // Thêm nhãn giá trị trên các cột
    svg.selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => xScale(d.hour) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.avgRevenue) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "9px")
        .style("fill", "black")
        .text((d) => `${(d.avgRevenue / 1e3).toFixed(1)}K VND`);

    // Vẽ trục X
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d => `${String(d).padStart(2, "0")}:00-${String(d).padStart(2, "0")}:59`)) // Sửa lại template literals
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "9px")
        .attr("x", -5)
        .attr("y", 10);

    // Vẽ trục Y
    svg.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d => `${(d / 1e3).toFixed(0)}K`));

    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Doanh số bán hàng theo Khung giờ");
}

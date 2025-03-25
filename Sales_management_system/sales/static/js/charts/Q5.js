export function render(data) {
    console.log("Dữ liệu Q5:", data);

    if (!data || data.length === 0) {
        console.error("Không có dữ liệu để vẽ biểu đồ.");
        return;
    }

    // Xóa biểu đồ cũ
    d3.select("#chart-container").html("");

    // Cấu hình kích thước
    const width = 900, height = 500, margin = { top: 60, right: 50, bottom: 80, left: 150 };

    // Tạo vùng vẽ SVG
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Thang đo
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.day))
        .range([0, width])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.avgRevenue)])
        .nice()
        .range([height, 0]);

    // Thang màu
    const colorScale = d3.scaleOrdinal()
        .domain(data.map(d => d.day))
        .range(d3.schemeTableau10);

    // Vẽ trục x
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d => `Ngày ${String(d).padStart(2, "0")}`))
        .selectAll("text")
        .attr("transform", "rotate(-90)")
        .style("text-anchor", "end")
        .style("font-size", "12px")
        .attr("x", -10)
        .attr("y", -10);

    // Vẽ trục y
    svg.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d => `${(d / 1e6).toFixed(0)}M`));

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px");

    // Vẽ cột
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.day))
        .attr("y", d => yScale(d.avgRevenue))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.avgRevenue))
        .attr("fill", d => colorScale(d.day))
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible").html(`
                <strong>Ngày ${d.day} </strong><br>
                <strong>Doanh số bán TB:</strong> ${(d.avgRevenue / 1e6).toFixed(1)} triệu VND
            `);
        })
        .on("mousemove", event => {
            tooltip.style("top", `${event.pageY - 40}px`)
                .style("left", `${event.pageX + 10}px`);
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
        .attr("x", d => xScale(d.day) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.avgRevenue) - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "9px")
        .style("fill", "black")
        .text(d => `${(d.avgRevenue / 1e6).toFixed(1)} tr`);

    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .text("Doanh số bán hàng trung bình theo Ngày trong Tháng");
}

export function render(data) {
    console.log("Dữ liệu Q7:", data);

    if (!data || data.length === 0) {
        console.error("Không có dữ liệu để vẽ biểu đồ.");
        return;
    }

    // Cấu hình kích thước biểu đồ
    const width = 700, height = 400, margin = { top: 50, right: 50, bottom: 50, left: 200 };

    // Tạo vùng vẽ SVG
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Thang đo
    const yScale = d3.scaleBand()
        .domain(data.map(d => `[${d.groupCode}] ${d.groupName}`))
        .range([0, height])
        .padding(0.2);

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.probability)])
        .nice()
        .range([0, width]);

    const colorScale = d3.scaleOrdinal()
        .domain(data.map(d => d.groupCode))
        .range(d3.schemeTableau10);

    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("font-family", "Arial, sans-serif")
        .style("visibility", "hidden");
    // Vẽ các thanh
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("y", d => yScale(`[${d.groupCode}] ${d.groupName}`))
        .attr("x", 0)
        .attr("width", d => xScale(d.probability))
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d.groupCode))
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible").html(`
                <strong>Nhóm hàng:</strong> [${d.groupCode}] ${d.groupName}<br>
                <strong>Xác suất Bán:</strong> ${d3.format(".1%")(d.probability)}
            `);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("top", `${event.pageY - 40}px`)
                .style("left", `${event.pageX + 10}px`);
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });

    // Vẽ trục Y
    svg.append("g")
        .call(d3.axisLeft(yScale));

    // Vẽ trục X
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format(".0%")));

    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .text("Xác suất bán hàng theo Nhóm hàng");

    // Thêm nhãn giá trị
    svg.selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("x", d => xScale(d.probability) + 5)
        .attr("y", d => yScale(`[${d.groupCode}] ${d.groupName}`) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("fill", "black")
        .text(d => d3.format(".1%")(d.probability));
}

// Q4.js: Vẽ biểu đồ doanh số trung bình theo ngày trong tuần
export function render(data) {
    console.log("Dữ liệu Q4:", data);

    // Bản đồ sắp xếp thứ tự ngày trong tuần
    const dayOrder = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

    // Sắp xếp dữ liệu theo thứ tự ngày trong tuần
    data.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

    // Thang đo màu
    const colorScale = d3.scaleOrdinal()
        .domain(data.map(d => d.day))
        .range(d3.schemeTableau10);

    // Cấu hình biểu đồ
    const width = 900, height = 500, margin = { top: 80, right: 50, bottom: 50, left: 150 };

    // Tạo SVG container
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Thang đo trục x (Ngày trong tuần)
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.day))
        .range([0, width])
        .padding(0.2);

    // Thang đo trục y (Doanh số trung bình)
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.avgRevenue)])
        .nice()
        .range([height, 0]);

    // Vẽ trục x
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("text-anchor", "middle")
        .style("font-size", "12px");

    // Vẽ trục y
    svg.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d => `${(d / 1e6).toFixed(0)}M`));

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px");

    // Vẽ cột biểu đồ
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
                <strong>${d.day}</strong><br>
                <strong>Doanh số TB:</strong> ${d3.format(",")(d.avgRevenue.toFixed(0))} VND
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

    // Thêm nhãn giá trị trên các cột
    svg.selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => xScale(d.day) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.avgRevenue) - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("fill", "black")
        .text(d => `${d3.format(",")(d.avgRevenue.toFixed(0))} VND`);

    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .text("Doanh số bán hàng trung bình theo Ngày trong tuần");
}

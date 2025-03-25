export function render(data) {
    console.log("Dữ liệu Q11:", data);

    if (!data || data.length === 0) {
        console.error("Không có dữ liệu để vẽ biểu đồ.");
        return;
    }

    // Lấy danh sách số lượng đơn hàng của từng khách hàng
    const purchaseFreq = data.map(d => +d.total_orders);
    const countCustomers = data.map(d => +d.count_customers);

    // Kích thước biểu đồ
    const width = 900;
    const height = 500;
    const margin = { top: 70, right: 50, bottom: 50, left: 180 };

    // Tạo SVG container
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .style("font-family", "Arial, sans-serif")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tính các bins cho histogram
    const maxFreq = d3.max(purchaseFreq);
    const bins = d3.bin()
        .domain([1, maxFreq + 0.5])
        .thresholds(maxFreq)(purchaseFreq);

    // Thang x
    const xScale = d3.scaleLinear()
        .domain([1, maxFreq + 0.5])
        .range([0, width]);

    // Thang y
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(countCustomers)])
        .nice()
        .range([height, 0]);

    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("visibility", "hidden");

    // Vẽ lưới ngang
    svg.selectAll("grid-line")
        .data(yScale.ticks())
        .join("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "2,2");

    // Vẽ histogram bars
    const barWidth = width / maxFreq;
    svg.selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", d => xScale(d.total_orders) - barWidth / 2 + 25)
        .attr("y", d => yScale(d.count_customers))
        .attr("width", barWidth - 1)
        .attr("height", d => height - yScale(d.count_customers))
        .attr("fill", "#366699")
        .attr("opacity", 0.7)
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible")
                .html(`Đã mua <strong>${d.total_orders}</strong> lần<br>Số lượng KH: ${d3.format(",")(d.count_customers)}`);
        })
        .on("mousemove", event => {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });

    // Vẽ trục x
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .ticks(maxFreq)
            .tickValues(d3.range(1, maxFreq + 1))
            .tickFormat(d => d));

    // Vẽ trục y
    svg.append("g")
        .call(d3.axisLeft(yScale)
            .tickFormat(d3.format(","))) // Điều chỉnh định dạng để hiện 1,000; 2,000; 3,000
        .append("text")
        .attr("fill", "#000")
        .attr("x", -margin.left)
        .attr("y", -70)
        .attr("text-anchor", "start")
        .attr("transform", `rotate(-90)`)
        .style("font-size", "12px")
        .text("Số Khách hàng");

    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text("Phân phối lượt mua hàng");

    // Ẩn đường viền
    svg.selectAll(".domain").remove();
    svg.selectAll(".tick line").remove();
}

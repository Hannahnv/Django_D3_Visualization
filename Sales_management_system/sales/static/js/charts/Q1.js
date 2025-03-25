// Q1.js: Vẽ biểu đồ doanh số theo mặt hàng
export function render(data) {
    console.log("Dữ liệu Q1:", data);

    // Kiểm tra dữ liệu
    if (!data || data.length === 0) {
        console.error("Không có dữ liệu để vẽ biểu đồ.");
        return;
    }

    // Xóa chart cũ
    d3.select("#chart-container").html("");

    // Cấu hình biểu đồ (Tăng margin.right)
    const width = 700, height = 400, margin = { top: 30, right: 160, bottom: 50, left: 200 };

    // Tạo SVG
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right) // Cộng thêm margin.right
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Thang đo
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total) * 1.1]) // Thêm 10% để tránh bị cắt
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(data.map(d => `[${d.code}] ${d.name}`))
        .range([0, height])
        .padding(0.2);

    // Thang màu (Mỗi nhóm hàng một màu)
    const color = d3.scaleOrdinal()
        .domain(data.map(d => d.groupCode)) // Lấy danh sách mã nhóm hàng
        .range(d3.schemeTableau10);

    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("visibility", "hidden")
        .style("font-family", "Arial, sans-serif");

    // Vẽ cột
    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("y", d => y(`[${d.code}] ${d.name}`))
        .attr("width", d => x(d.total))
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.groupCode))
        .on("mouseover", function (event, d) {
            tooltip.style("visibility", "visible")
                .html(`
                    <strong>Mặt hàng:</strong> [${d.code}] ${d.name}<br>
                    <strong>Nhóm hàng:</strong> [${d.groupCode}] ${d.groupName}<br>
                    <strong>Doanh số:</strong> ${d3.format(",")(d.total)} VND
                `); // Hiển thị Mặt hàng, Nhóm hàng và Doanh số
        })
        .on("mousemove", function (event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
        });

    // Thêm nhãn
    svg.selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("x", d => x(d.total) + 5) // Cách cột 5px
        .attr("y", d => y(`[${d.code}] ${d.name}`) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .text(d => {
            const value = d.total;
            if (value >= 1e9) {
                return `${(value / 1e9).toFixed(1)} tỷ VND`;
            } else if (value >= 1e6) {
                return `${Math.round(value / 1e6)} triệu VND`;
            } else {
                return `${Math.round(value / 1e3)} nghìn VND`;
            }
        });

    // Vẽ trục
    svg.append("g")
        .call(d3.axisLeft(y))
        .attr("font-size", "10px");

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(10, "~s"));
    
    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2) // Căn giữa theo chiều ngang của toàn bộ SVG
        .attr("y", -margin.top / 4) // Đặt tiêu đề phía trên biểu đồ
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text("Doanh số bán hàng theo Mặt hàng");

    // Thêm chú thích màu (Legend)
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 30}, 0)`);

    // Nhóm mã và tên nhóm hàng (groupCode -> groupName)
    const uniqueGroups = Array.from(new Set(data.map(d => `${d.groupCode}|${d.groupName}`)));

    uniqueGroups.forEach((item, i) => {
        const [groupCode, groupName] = item.split("|");  // Tách mã và tên nhóm hàng

        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        // Hình vuông màu
        legendRow.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", color(groupCode));

        // Văn bản hiển thị
        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .style("font-size", "12px")
            .text(`[${groupCode}] ${groupName}`);
    });

    console.log("✅ Biểu đồ Q1 đã render xong.");
}

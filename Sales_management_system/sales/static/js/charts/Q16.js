export function render(data) {
    // Xóa nội dung container trước khi vẽ mới
    const container = d3.select("#chart-container").html("");
    
    // Kiểm tra dữ liệu có tồn tại hay không
    if (!data || data.length === 0) {
        container.append("div")
            .attr("class", "alert alert-info")
            .style("margin-top", "50px")
            .style("text-align", "center")
            .text("Không có dữ liệu để hiển thị.");
        return;
    }
    
    // Sắp xếp dữ liệu theo AOV giảm dần
    data.sort((a, b) => b.aov - a.aov);
    
    // Cấu hình kích thước
    const margin = { top: 80, right: 60, bottom: 120, left: 80 };
    const width = 960 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    // Tạo SVG container
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Thêm tiêu đề
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Giá trị trung bình đơn hàng (AOV) theo phân khúc khách hàng");
    
    // Tạo thang đo cho trục X (các phân khúc khách hàng)
    const x = d3.scaleBand()
        .domain(data.map(d => d.segment_code))
        .range([0, width])
        .padding(0.2); // Chỉnh padding giống Q13
    
    // Tạo thang đo cho trục Y (AOV)
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.aov) * 1.1]) // Tăng 10% để có khoảng trống
        .range([height, 0]);
    
    // Thêm trục X
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "middle") // Chỉnh thẳng trục X
        .style("font-size", "12px");
    
    // Thêm nhãn trục X
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 5) // Chỉnh giống Q13
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Phân khúc khách hàng");
    
    // Thêm trục Y
    svg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",.0f"))) // Chỉnh ticks giống Q13
        .style("font-size", "12px");
    
    // Thêm nhãn trục Y
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2))
        .attr("y", -margin.left + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Giá trị trung bình đơn hàng (VNĐ)");
    
    // Thêm đường kẻ ngang để dễ đọc
    svg.selectAll(".grid-line")
        .data(y.ticks())
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => y(d))
        .attr("y2", d => y(d))
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "3,3");
    
    // Tạo tooltip
    const tooltip = container.append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("pointer-events", "none")
        .style("z-index", 100);
    
    // Tạo thang màu (Mỗi phân khúc một màu giống Q13)
    const colorScale = d3.scaleOrdinal()
        .domain(data.map(d => d.segment_code))
        .range(d3.schemeTableau10);
    
    // Tạo các cột
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.segment_code))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.aov)) // Không bắt đầu từ dưới lên
        .attr("height", d => height - y(d.aov))
        .attr("fill", d => colorScale(d.segment_code)) // Sử dụng thang màu mới
        .on("mouseover", function(event, d) {
            // Hiệu ứng hover
            d3.select(this)
                .attr("fill", "#ff7f0e");
            
            // Hiển thị tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            
            tooltip.html(`<strong>Phân khúc: [${d.segment_code}] ${d.segment_name}</strong><br>
                          Giá trị trung bình đơn hàng: ${d.aov.toLocaleString()} VNĐ<br>`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            // Trở về màu ban đầu
            d3.select(this)
                .attr("fill", d => colorScale(d.segment_code)); // Sử dụng thang màu mới
            
            // Ẩn tooltip
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    // Thêm label AOV trên đầu mỗi cột
    svg.selectAll(".bar-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.segment_code) + x.bandwidth() / 2)
        .attr("y", d => y(d.aov) - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#333")
        .text(d => d3.format(",.0f")(d.aov))
        .duration(800)
        .delay((d, i) => i * 100 + 400)
        .style("opacity", 1);
    
}
export function render(data) {
    // Xóa nội dung container trước khi vẽ mới
    const container = d3.select("#chart-container").html("");
    
    // Cấu hình kích thước
    const margin = { top: 60, right: 30, bottom: 70, left: 80 };
    const width = 800 - margin.left - margin.right;
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
        .text("Số lượng khách hàng theo phân khúc");
    
    // Tạo thang đo cho trục X
    const x = d3.scaleBand()
        .domain(data.map(d => d.segment_code))
        .range([0, width])
        .padding(0.2);
    
    // Tạo thang đo cho trục Y
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.customer_count) * 1.1]) // Tăng 10% để có khoảng trống phía trên
        .range([height, 0]);
    
    // Thêm trục X
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "middle") // Change to "middle" for straight alignment
        .style("font-size", "12px");
    
    // Thêm nhãn trục X
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Phân khúc khách hàng");
    
    // Thêm trục Y
    svg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",.0f")))
        .style("font-size", "12px");
    
    // Thêm nhãn trục Y
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2))
        .attr("y", -margin.left + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Số lượng khách hàng");
    
    // Tạo tooltip
    const tooltip = container.append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("pointer-events", "none");
    
    // Tạo thang màu (Mỗi phân khúc một màu)
    const colorScale = d3.scaleOrdinal()
        .domain(data.map(d => d.segment_code)) // Lấy danh sách mã phân khúc
        .range(d3.schemeTableau10);
    
    // Tạo các cột
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.segment_code))
        .attr("y", d => y(d.customer_count))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.customer_count))
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
                            Số lượng khách hàng: ${d.customer_count.toLocaleString()}`)
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
    
    // Thêm label trên đầu mỗi cột
    svg.selectAll(".bar-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.segment_code) + x.bandwidth() / 2)
        .attr("y", d => y(d.customer_count) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(d => d.customer_count.toLocaleString());
}
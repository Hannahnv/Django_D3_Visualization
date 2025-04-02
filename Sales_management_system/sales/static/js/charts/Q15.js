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
    
    // Lấy tháng cao điểm từ dữ liệu
    const peakMonth = data[0].peak_month;
    
    // Sắp xếp dữ liệu theo doanh số (tăng dần để hiển thị doanh số cao nhất ở trên cùng)
    data.sort((a, b) => a.total_revenue - b.total_revenue);
    
    // Cấu hình kích thước
    const margin = { top: 80, right: 120, bottom: 60, left: 120 };
    const width = 900 - margin.left - margin.right;
    const height = Math.max(500, data.length * 50) - margin.top - margin.bottom;
    
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
        .text(`Doanh số theo phân khúc khách hàng trong tháng cao điểm (Tháng ${peakMonth})`);
    
    // Tạo thang đo cho trục Y (các phân khúc khách hàng)
    const y = d3.scaleBand()
        .domain(data.map(d => d.segment_code)) // Chỉ sử dụng mã phân khúc khách hàng
        .range([height, 0])
        .padding(0.2);
    
    // Tạo thang đo cho trục X (doanh số)
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total_revenue) * 1.1]) // Tăng 10% để có khoảng trống
        .range([0, width]);
    
    // Thêm trục Y
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "12px");
    
    // Thêm nhãn trục Y
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2))
        .attr("y", -margin.left + 30)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Phân khúc khách hàng");
    
    // Thêm trục X
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(10).tickFormat(d => {
            if (d >= 1e6) {
                return `${d / 1e6}M`;
            } else {
                return d;
            }
        }))
        .style("font-size", "12px");
    
    // Thêm nhãn trục X
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Doanh số (VNĐ)");
    
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
    
    // Sửa đổi thang màu để sử dụng d3.schemeTableau10 giống Q14
    const color = d3.scaleOrdinal()
        .domain(data.map(d => d.segment_code))
        .range(d3.schemeTableau10);
    
    // Tạo các cột ngang
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.segment_code))
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.total_revenue))
        .attr("fill", d => color(d.segment_code)) // Sử dụng thang màu mới
        .on("mouseover", function(event, d) {
            // Hiệu ứng hover
            d3.select(this)
                .attr("fill", "#ff7f0e");
            
            // Hiển thị tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            
            tooltip.html(`<strong>Phân khúc: [${d.segment_code}] ${d.segment_name}</strong><br>
                            Doanh số tháng ${peakMonth}: ${d.total_revenue.toLocaleString()} VNĐ`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            // Trở về màu ban đầu
            d3.select(this)
                .attr("fill", d => color(d.segment_code));
            
            // Ẩn tooltip
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    // Thêm label doanh số ở cuối mỗi cột
    svg.selectAll(".bar-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("y", d => y(d.segment_code) + y.bandwidth() / 2 + 5)
        .attr("x", d => x(d.total_revenue) + 5)
        .style("font-size", "12px")
        .style("fill", "#333")
        .text(d => {
            const value = d.total_revenue;
            if (value >= 1e9) {
                return `${(value / 1e9).toFixed(1)} tỷ VND`;
            } else if (value >= 1e6) {
                return `${Math.round(value / 1e6)} triệu VND`;
            } else {
                return `${Math.round(value / 1e3)} nghìn VND`;
            }
        });
    
    // Thêm đường kẻ ngang để dễ đọc
    svg.selectAll(".grid-line")
        .data(data)
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => y(d.segment_code) + y.bandwidth())
        .attr("y2", d => y(d.segment_code) + y.bandwidth())
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "3,3");
}
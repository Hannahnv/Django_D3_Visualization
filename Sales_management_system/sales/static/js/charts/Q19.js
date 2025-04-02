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
    
    // Cấu hình kích thước
    const margin = { top: 60, right: 20, bottom: 80, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    // Định dạng tiền tệ
    const formatCurrency = d3.format(",.0f");
    
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
        .text("Phân phối chi tiêu theo phân khúc khách hàng");
    
    // Lấy tất cả các phân khúc
    const segments = data.map(d => d.segment_code);
    
    // Tìm giá trị min và max cho trục Y
    const allValues = data.flatMap(d => d.raw_data);
    const yMin = 0; // Bắt đầu từ 0
    const yMax = d3.max(allValues) * 1.1; // Thêm khoảng trống 10% phía trên
    
    // Tạo thang đo X (phân khúc khách hàng)
    const x = d3.scaleBand()
        .domain(segments)
        .range([0, width])
        .paddingInner(0.5)
        .paddingOuter(0.3);
    
    // Tạo thang đo Y (chi tiêu)
    const y = d3.scaleLinear()
        .domain([yMin, yMax])
        .range([height, 0]);
    
    // Màu sắc cho các box
    const colorScale = d3.scaleOrdinal()
        .domain(segments)
        .range(d3.schemeCategory10);
    
    // Thêm trục X
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .style("font-size", "12px")
        .append("text")
        .attr("x", width / 2)
        .attr("y", margin.bottom - 20)
        .attr("fill", "#000")
        .style("font-size", "14px")
        .style("text-anchor", "middle")
        .text("Phân khúc khách hàng");
    
    // Thêm trục Y
    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => `${d3.format(",.0f")(d)}`))
        .style("font-size", "12px")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 10) // Adjusted spacing from the Y-axis
        .attr("fill", "#000")
        .style("font-size", "14px")
        .style("text-anchor", "middle")
        .text("Chi tiêu (VNĐ)");
    
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
    
    // Vẽ box plot cho mỗi phân khúc
    data.forEach(d => {
        const segment = d.segment_code;
        const boxWidth = x.bandwidth();
        const boxX = x(segment);
        const boxColor = colorScale(segment);
        
        // Vẽ vertical line (min to max)
        svg.append("line")
            .attr("x1", boxX + boxWidth / 2)
            .attr("x2", boxX + boxWidth / 2)
            .attr("y1", y(d.whisker_bottom))
            .attr("y2", y(d.whisker_top))
            .attr("stroke", "#000")
            .attr("stroke-width", 1);
        
        // Vẽ box (Q1 to Q3)
        svg.append("rect")
            .attr("x", boxX)
            .attr("y", y(d.q3))
            .attr("width", boxWidth)
            .attr("height", y(d.q1) - y(d.q3))
            .attr("fill", boxColor)
            .attr("opacity", 0.7)
            .attr("stroke", "#000")
            .on("mouseover", function(event) {
                // Hiệu ứng hover
                d3.select(this)
                    .attr("opacity", 1);
                
                // Hiển thị tooltip
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                
                tooltip.html(`<strong>Phân khúc: ${segment}</strong><br>
                               Min: ${formatCurrency(d.min)} VNĐ<br>
                               Q1: ${formatCurrency(d.q1)} VNĐ<br>
                               Median: ${formatCurrency(d.median)} VNĐ<br>
                               Q3: ${formatCurrency(d.q3)} VNĐ<br>
                               Max: ${formatCurrency(d.max)} VNĐ`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                // Trở về trạng thái ban đầu
                d3.select(this)
                    .attr("opacity", 0.7);
                
                // Ẩn tooltip
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
        
        // Vẽ đường median
        svg.append("line")
            .attr("x1", boxX)
            .attr("x2", boxX + boxWidth)
            .attr("y1", y(d.median))
            .attr("y2", y(d.median))
            .attr("stroke", "#000")
            .attr("stroke-width", 2);
        
        // Vẽ whiskers (horizontal lines at end of vertical line)
        // Bottom whisker
        svg.append("line")
            .attr("x1", boxX + boxWidth * 0.25)
            .attr("x2", boxX + boxWidth * 0.75)
            .attr("y1", y(d.whisker_bottom))
            .attr("y2", y(d.whisker_bottom))
            .attr("stroke", "#000")
            .attr("stroke-width", 1);
        
        // Top whisker
        svg.append("line")
            .attr("x1", boxX + boxWidth * 0.25)
            .attr("x2", boxX + boxWidth * 0.75)
            .attr("y1", y(d.whisker_top))
            .attr("y2", y(d.whisker_top))
            .attr("stroke", "#000")
            .attr("stroke-width", 1);
        
        // Vẽ outliers
        d.outliers.forEach(outlier => {
            // Chỉ vẽ outlier nằm trong phạm vi hiển thị
            if (outlier <= yMax) {
                svg.append("circle")
                    .attr("cx", boxX + boxWidth / 2 + (Math.random() - 0.5) * boxWidth * 0.6) // Thêm jitter
                    .attr("cy", y(outlier))
                    .attr("r", 3)
                    .attr("fill", "#000")
                    .attr("opacity", 0.5)
                    .on("mouseover", function(event) {
                        // Hiệu ứng hover
                        d3.select(this)
                            .attr("r", 5)
                            .attr("opacity", 1);
                        
                        // Hiển thị tooltip
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", .9);
                        
                        tooltip.html(`<strong>Phân khúc: ${segment}</strong><br>
                                       Chi tiêu: ${formatCurrency(outlier)} VNĐ<br>
                                       (Outlier)`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        // Trở về trạng thái ban đầu
                        d3.select(this)
                            .attr("r", 3)
                            .attr("opacity", 0.5);
                        
                        // Ẩn tooltip
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });
            }
        });
        
        // Vẽ điểm dữ liệu (tùy chọn cho dữ liệu nhỏ)
        if (d.raw_data.length < 100) { // Chỉ vẽ khi số lượng điểm hợp lý
            d.raw_data.forEach(value => {
                svg.append("circle")
                    .attr("cx", boxX + boxWidth / 2 + (Math.random() - 0.5) * boxWidth * 0.8) // Thêm jitter
                    .attr("cy", y(value))
                    .attr("r", 2)
                    .attr("fill", "#333")
                    .attr("opacity", 0.3)
                    .on("mouseover", function(event) {
                        // Hiệu ứng hover
                        d3.select(this)
                            .attr("r", 4)
                            .attr("opacity", 0.8);
                        
                        // Hiển thị tooltip
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", .9);
                        
                        tooltip.html(`<strong>Phân khúc: ${segment}</strong><br>
                                       Chi tiêu: ${formatCurrency(value)} VNĐ`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        // Trở về trạng thái ban đầu
                        d3.select(this)
                            .attr("r", 2)
                            .attr("opacity", 0.3);
                        
                        // Ẩn tooltip
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });
            });
        }
    });
    
}
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
    const margin = { top: 60, right: 80, bottom: 70, left: 80 };
    const width = 1000 - margin.left - margin.right;
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
        .text("Doanh số và Tăng trưởng theo tháng");
    
    // Thêm định dạng cho tháng
    const formatMonth = d => `T${d}`;
    
    // Tạo thang đo cho trục X (tháng)
    const x = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.3);
    
    // Tạo thang đo cho trục Y bên trái (doanh số)
    const yLeft = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total_revenue) * 1.1])
        .range([height, 0]);
    
    // Tạo thang đo cho trục Y bên phải (tăng trưởng)
    const maxGrowth = d3.max(data, d => Math.abs(d.growth_rate)) * 1.2;
    const yRight = d3.scaleLinear()
        .domain([-maxGrowth, maxGrowth])
        .range([height, 0]);
    
    // Định dạng số tiền (loại bỏ .0 nếu có)
    const formatMoney = d3.format(",.0f");
    
    // Định dạng phần trăm (loại bỏ .0 nếu có)
    const formatPercent = d3.format("+.0f");
    
    // Thêm trục X
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(formatMonth))
        .selectAll("text")
        .style("font-size", "12px");
    
    // Thêm trục Y bên trái (doanh số)
    svg.append("g")
        .call(d3.axisLeft(yLeft).ticks(5).tickFormat(d => `${formatMoney(d / 1000000)}M`))
        .style("font-size", "12px");
    
    // Thêm nhãn trục Y bên trái
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2))
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#1f77b4")
        .text("Doanh số (VNĐ)");
    
    // Thêm trục Y bên phải (tăng trưởng)
    svg.append("g")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(yRight).ticks(5).tickFormat(d => `${formatPercent(d)}%`))
        .style("font-size", "12px")
        .selectAll("text")
        .style("fill", "#e41a1c");
    
    // Thêm nhãn trục Y bên phải
    svg.append("text")
        .attr("transform", "rotate(90)")
        .attr("x", height / 2)
        .attr("y", -width - 60)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#e41a1c")
        .text("Tăng trưởng (%)");
    
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
    
    // Tạo màu cho các cột dựa vào tăng trưởng
    const barColor = d => {
        if (d.growth_rate > 0) return "#5cb85c"; // Xanh lá cho tăng trưởng dương
        else if (d.growth_rate < 0) return "#d9534f"; // Đỏ cho tăng trưởng âm
        else return "#f0ad4e"; // Cam cho tăng trưởng bằng 0
    };
    
    // Thêm vùng nền để phân biệt các tháng
    svg.selectAll(".month-background")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "month-background")
        .attr("x", d => x(d.month))
        .attr("y", 0)
        .attr("width", x.bandwidth())
        .attr("height", height)
        .attr("fill", (d, i) => i % 2 === 0 ? "#f0f8ff" : "#e6f3ff")
        .attr("opacity", 0.3);
    
    // Tạo các cột doanh số
    svg.selectAll(".revenue-bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "revenue-bar")
        .attr("x", d => x(d.month))
        .attr("y", d => yLeft(d.total_revenue))
        .attr("width", x.bandwidth())
        .attr("height", d => height - yLeft(d.total_revenue))
        .attr("fill", d => barColor(d))
        .attr("opacity", 0.8)
        .on("mouseover", function(event, d) {
            // Hiệu ứng hover
            d3.select(this)
                .attr("opacity", 1)
                .attr("stroke", "#333")
                .attr("stroke-width", 1);
            
            // Hiển thị tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            
            tooltip.html(`<strong>Tháng ${d.month}</strong><br>
                          Doanh số: ${formatMoney(d.total_revenue).replace(/\.0$/, "")} VNĐ<br>
                          Tăng trưởng: ${formatPercent(d.growth_rate)}%`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            // Trở về trạng thái ban đầu
            d3.select(this)
                .attr("opacity", 0.8)
                .attr("stroke", "none");
            
            // Ẩn tooltip
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    // Thêm label doanh số trên mỗi cột
    svg.selectAll(".revenue-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "revenue-label")
        .attr("x", d => x(d.month) + x.bandwidth() / 2)
        .attr("y", d => yLeft(d.total_revenue) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#333")
        .text(d => `${formatMoney(d.total_revenue / 1000000)}M`);
    
    // Tạo line generator cho đường tăng trưởng
    const growthLine = d3.line()
        .x(d => x(d.month) + x.bandwidth() / 2)
        .y(d => yRight(d.growth_rate));
    
    // Tạo đường tăng trưởng
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#e41a1c")
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round")
        .attr("d", growthLine);
    
    // Thêm điểm cho đường tăng trưởng
    svg.selectAll(".growth-point")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "growth-point")
        .attr("cx", d => x(d.month) + x.bandwidth() / 2)
        .attr("cy", d => yRight(d.growth_rate))
        .attr("r", 5)
        .attr("fill", "#e41a1c")
        .on("mouseover", function(event, d) {
            // Hiệu ứng hover
            d3.select(this)
                .attr("r", 8);
            
            // Hiển thị tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            
            tooltip.html(`<strong>Tháng ${d.month}</strong><br>
                          Tăng trưởng: ${formatPercent(d.growth_rate)}%<br>
                          Doanh số: ${formatMoney(d.total_revenue).replace(/\.0$/, "")} VNĐ`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            // Trở về trạng thái ban đầu
            d3.select(this)
                .attr("r", 5);
            
            // Ẩn tooltip
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    // Thêm label tăng trưởng trên đường tăng trưởng
    svg.selectAll(".growth-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "growth-label")
        .attr("x", d => x(d.month) + x.bandwidth() / 2)
        .attr("y", d => yRight(d.growth_rate) - 15)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#e41a1c")
        .style("font-weight", "bold")
        .text(d => `${formatPercent(d.growth_rate)}%`);
    
    // Thêm ghi chú
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 200}, -30)`);
    
    // Ghi chú cho cột doanh số
    legend.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", "#5cb85c")
        .attr("opacity", 0.8);
    
    legend.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .style("font-size", "12px")
        .text("Doanh số");
    
    // Ghi chú cho đường tăng trưởng
    legend.append("line")
        .attr("x1", 100)
        .attr("y1", 7)
        .attr("x2", 115)
        .attr("y2", 7)
        .attr("stroke", "#e41a1c")
        .attr("stroke-width", 3);
    
    legend.append("circle")
        .attr("cx", 107)
        .attr("cy", 7)
        .attr("r", 4)
        .attr("fill", "#e41a1c");
    
    legend.append("text")
        .attr("x", 120)
        .attr("y", 12)
        .style("font-size", "12px")
        .text("Tăng trưởng");
}
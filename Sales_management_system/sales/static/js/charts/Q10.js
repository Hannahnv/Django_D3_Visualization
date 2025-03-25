export function render(data) {
    // Xóa nội dung container trước khi vẽ mới
    const container = d3.select("#chart-container").html("");
    
    // Cấu hình kích thước
    const subplotWidth = 300;
    const subplotHeight = 150;
    const margin = { top: 90, right: 40, bottom: 100, left: 40 };
    const padding = 40;
    
    // Xác định số hàng và cột
    const cols = 3;
    const rows = Math.ceil(data.length / cols);
    
    // Tính kích thước tổng thể
    const totalWidth = cols * (subplotWidth + margin.left + margin.right) + (cols - 1) * padding;
    const totalHeight = rows * (subplotHeight + margin.top + margin.bottom) + (rows - 1) * padding;
    
    // Tạo container SVG
    const svg = container.append("svg")
        .attr("width", totalWidth)
        .attr("height", totalHeight + 40) // Thêm khoảng trống cho tiêu đề
        .style("font-family", "Arial, sans-serif");
    
    // Thêm tiêu đề chính
    svg.append("text")
        .attr("x", totalWidth / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "17px")
        .style("font-weight", "bold")
        .text("Xác suất bán hàng của mặt hàng theo nhóm hàng trong từng tháng");
    
    // Tạo tooltip
    const tooltip = container.append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", 1000);
    
    // Xác định tất cả các tháng
    const allMonths = new Set();
    const allProducts = [];
    
    // Thu thập tất cả các tháng và sản phẩm
    data.forEach(group => {
        group.products.forEach(product => {
            allProducts.push(product.product_code);
            product.monthly_data.forEach(item => {
                allMonths.add(item.month);
            });
        });
    });
    
    // Chuyển Set thành mảng và sắp xếp
    const months = Array.from(allMonths).sort((a, b) => a - b);
    
    // Tạo bảng màu
    const colorScale = d3.scaleOrdinal()
        .domain(allProducts)
        .range(d3.quantize(d3.interpolateRainbow, allProducts.length));
    
    // Vẽ các subplot
    data.forEach((group, groupIndex) => {
        // Tính vị trí của subplot
        const row = Math.floor(groupIndex / cols);
        const col = groupIndex % cols;
        const x = col * (subplotWidth + margin.left + margin.right + padding) + margin.left;
        const y = row * (subplotHeight + margin.top + margin.bottom + padding) + margin.top + 30; // +30 cho tiêu đề
        
        // Tạo nhóm cho subplot
        const subplot = svg.append("g")
            .attr("transform", `translate(${x}, ${y})`);
        
        // Chuẩn bị dữ liệu với đầy đủ các tháng cho mỗi sản phẩm
        const productsData = [];
        
        group.products.forEach(product => {
            // Tạo map cho dữ liệu tháng
            const monthMap = new Map();
            
            // Khởi tạo tất cả các tháng với giá trị 0
            months.forEach(month => monthMap.set(month, 0));
            
            // Cập nhật giá trị xác suất thực tế
            product.monthly_data.forEach(item => {
                monthMap.set(item.month, item.probability);
            });
            
            // Thêm vào mảng dữ liệu
            productsData.push({
                code: product.product_code,
                name: product.product_name,
                data: Array.from(monthMap.entries()).sort((a, b) => a[0] - b[0])
            });
        });
        
        // Thang đo trục X (tháng)
        const xScale = d3.scaleLinear()
            .domain([d3.min(months), d3.max(months)])
            .range([0, subplotWidth]);
        
        // Tìm min/max xác suất
        let minProb = 1, maxProb = 0;
        productsData.forEach(product => {
            product.data.forEach(([_, prob]) => {
                if (prob < minProb) minProb = prob;
                if (prob > maxProb) maxProb = prob;
            });
        });
        
        // Thêm khoảng đệm
        minProb = Math.max(0, Math.floor(minProb * 20) / 20);
        maxProb = Math.min(1, Math.ceil(maxProb * 20) / 20);
        
        // Thang đo cho trục Y (xác suất)
        let yScale;
        if (group.group_code === "BOT") {
            // Xử lý đặc biệt cho nhóm BOT
            yScale = d3.scaleLinear()
                .domain([0.9, 1.1])
                .range([subplotHeight, 0]);
        } else {
            yScale = d3.scaleLinear()
                .domain([minProb, maxProb])
                .range([subplotHeight, 0]);
        }
        
        // Vẽ trục X
        subplot.append("g")
            .attr("transform", `translate(0, ${subplotHeight})`)
            .call(d3.axisBottom(xScale)
                .tickFormat(d => `T${d.toString().padStart(2, '0')}`)
                .ticks(months.length))
            .selectAll("text")
            .style("font-size", "10px");
        
        // Vẽ trục Y
        subplot.append("g")
            .call(d3.axisLeft(yScale)
                .tickFormat(d3.format(".0%"))
                .ticks(group.group_code === "BOT" ? 3 : 5));
        
        // Generator đường
        const lineGenerator = d3.line()
            .x(d => xScale(d[0]))
            .y(d => yScale(d[1]));
        
        // Vẽ đường và điểm
        productsData.forEach(product => {
            // Vẽ đường
            subplot.append("path")
                .datum(product.data)
                .attr("fill", "none")
                .attr("stroke", colorScale(product.code))
                .attr("stroke-width", 1.5)
                .attr("d", lineGenerator);
            
            // Vẽ các điểm
            subplot.selectAll(`.point-${product.code.replace(/\s+/g, '-')}`)
                .data(product.data)
                .enter()
                .append("circle")
                .attr("class", `point-${product.code.replace(/\s+/g, '-')}`)
                .attr("cx", d => xScale(d[0]))
                .attr("cy", d => yScale(d[1]))
                .attr("r", 4)
                .attr("fill", colorScale(product.code))
                .on("mouseover", function(event, d) {
                    // Hiệu ứng hover
                    d3.select(this)
                        .attr("r", 6)
                        .style("stroke", "#000")
                        .style("stroke-width", 2);
                    
                    // Hiển thị tooltip
                    tooltip.style("opacity", 0.9)
                        .html(`
                            <strong>T${d[0].toString().padStart(2, '0')} | Mặt hàng [${product.code}] ${product.name}</strong><br>
                            Nhóm hàng: [${group.group_code}] ${group.group_name}<br>
                            Xác suất Bán / Nhóm hàng: ${(d[1] * 100).toFixed(1)}%
                        `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    // Trả về trạng thái ban đầu
                    d3.select(this)
                        .attr("r", 4)
                        .style("stroke", "none");
                    
                    // Ẩn tooltip
                    tooltip.style("opacity", 0);
                });
        });
        
        // Tiêu đề subplot
        subplot.append("text")
            .attr("x", subplotWidth / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "13px")
            .style("font-weight", "bold")
            .text(`[${group.group_code}] ${group.group_name}`);
        
        // Chú thích
        const legend = subplot.append("g")
            .attr("transform", `translate(0, ${subplotHeight + 20})`);
        
        productsData.forEach((product, i) => {
            const legendItem = legend.append("g")
                .attr("transform", `translate(${(i % 2) * 150}, ${Math.floor(i / 2) * 20})`);
            
            legendItem.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", colorScale(product.code));
            
            legendItem.append("text")
                .attr("x", 15)
                .attr("y", 9)
                .style("font-size", "10px")
                .text(`[${product.code}] ${product.name.substring(0, 15)}`);
        });
    });
}
export function render(data) {
    // Check if data exists and has the expected structure
    if (!data || !Array.isArray(data)) {
        console.error("Invalid data format:", data);
        return;
    }

    // Process the data to flatten the nested structure
    let processedData = [];
    data.forEach(group => {
        if (group.products && Array.isArray(group.products)) {
            // Get the group name from the first product if available
            const groupName = group.products[0]?.group_name || "";
            
            group.products.forEach(product => {
                processedData.push({
                    group_code: group.group_code,
                    group_name: groupName,
                    product_code: product.product_code,
                    product_name: product.product_name,
                    probability: product.probability
                });
            });
        }
    });

    // If no processed data, show error and return
    if (processedData.length === 0) {
        console.error("No valid data after processing:", data);
        return;
    }

    // Nhóm dữ liệu theo nhóm sản phẩm
    const groupedByProductGroup = d3.group(processedData, d => d.group_code);

    // Cấu hình subplot
    const subplotWidth = 250;
    const subplotHeight = 150;
    const margin = { top: 90, right: 50, bottom: 40, left: 160 };
    const padding = 20;

    // Tính toán bố cục lưới (2 hàng x 3 cột)
    const rows = 2;
    const cols = 3;
    const totalWidth = cols * (subplotWidth + margin.left + margin.right) + (cols - 1) * padding;
    const totalHeight = rows * (subplotHeight + margin.top + margin.bottom) + (rows - 1) * padding;

    // Clear existing chart if any
    d3.select("#chart-container").html("");

    // Tạo container SVG chính
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", totalWidth)
        .attr("height", totalHeight)
        .style("font-family", "Arial, sans-serif");

    // Tạo tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "d3-tooltip")
        .style("position", "absolute")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("padding", "10px")
        .style("font-family", "Arial, sans-serif")
        .style("visibility", "hidden");

    // Tạo một tập hợp mã mặt hàng duy nhất để đảm bảo màu sắc duy nhất
    const allItems = Array.from(new Set(processedData.map(d => d.product_code)));
    const colorScale = d3.scaleOrdinal()
        .domain(allItems)
        .range(d3.quantize(d3.interpolateRainbow, allItems.length));

    // Tạo từng subplot
    Array.from(groupedByProductGroup).forEach(([groupCode, group], index) => {
        // Sắp xếp các sản phẩm theo xác suất giảm dần
        group.sort((a, b) => b.probability - a.probability);

        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = col * (subplotWidth + margin.left + margin.right + padding);
        const y = row * (subplotHeight + margin.top + margin.bottom + padding);

        const subplot = svg.append("g")
            .attr("transform", `translate(${x + margin.left}, ${y + margin.top})`);

        // Thang đo cho subplot này
        const yScale = d3.scaleBand()
            .domain(group.map(d => `[${d.product_code}] ${d.product_name}`))
            .range([0, subplotHeight])
            .padding(0.2);

        const maxProbability = d3.max(group, d => d.probability);
        const xScale = d3.scaleLinear()
            .domain([0, Math.ceil(maxProbability * 10) / 10])
            .nice()
            .range([0, subplotWidth]);

        // Xác định khoảng tick dựa trên group_code
        let tickInterval;
        if (groupCode === "BOT" || groupCode === "TTC") {
            tickInterval = 0.2; // 20%
        } else if (groupCode === "TMX") {
            tickInterval = 0.1; // 10%
        } else {
            tickInterval = 0.05; // 5%
        }

        // Vẽ trục y
        subplot.append("g")
            .call(d3.axisLeft(yScale).tickSize(0))
            .selectAll("text")
            .style("font-size", "10px")
            .style("text-anchor", "end");

        // Vẽ trục x
        subplot.append("g")
            .attr("transform", `translate(0, ${subplotHeight})`)
            .call(
                d3.axisBottom(xScale)
                    .ticks(Math.ceil(maxProbability / tickInterval))
                    .tickFormat(d3.format(".0%"))
            )
            .style("font-size", "10px");

        // Vẽ các thanh
        subplot.selectAll(".bar")
            .data(group)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("y", d => yScale(`[${d.product_code}] ${d.product_name}`))
            .attr("x", 0)
            .attr("width", d => xScale(d.probability))
            .attr("height", yScale.bandwidth())
            .attr("fill", d => colorScale(d.product_code))
            .on("mouseover", (event, d) => {
                tooltip.style("visibility", "visible").html(`
                    <strong>Mặt hàng:</strong> [${d.product_code}] ${d.product_name}<br>
                    <strong>Nhóm hàng:</strong> [${d.group_code}] ${d.group_name}<br>
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

        // Thêm nhãn giá trị
        subplot.selectAll(".label")
            .data(group)
            .enter()
            .append("text")
            .attr("class", "label")
            .attr("x", d => {
                const xValue = xScale(d.probability);
                return isNaN(xValue) ? 0 : xValue + 5;
            })
            .attr("y", d => yScale(`[${d.product_code}] ${d.product_name}`) + yScale.bandwidth() / 2)
            .attr("dy", "0.35em")
            .style("font-size", "10px")
            .style("fill", "black")
            .text(d => d3.format(".1%")(d.probability));

        // Thêm tiêu đề subplot
        subplot.append("text")
            .attr("x", subplotWidth / 2)
            .attr("y", -margin.top / 5)
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .text(`[${groupCode}] ${group[0].group_name}`);
    });

    // Thêm tiêu đề chính
    svg.append("text")
        .attr("x", totalWidth / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "17px")
        .style("font-weight", "bold")
        .text("Xác suất bán hàng của từng mặt hàng theo Nhóm hàng");
}
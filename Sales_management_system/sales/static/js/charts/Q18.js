export function render(data) {
    // Xóa nội dung container trước khi vẽ mới
    const container = d3.select("#chart-container").html("");
    
    // Kiểm tra dữ liệu có tồn tại hay không
    if (!data || !data.matrix || data.matrix.length === 0) {
        container.append("div")
            .attr("class", "alert alert-info")
            .style("margin-top", "50px")
            .style("text-align", "center")
            .text("Không có dữ liệu để hiển thị.");
        return;
    }
    
    // Lấy dữ liệu từ API
    const { segments, categories, segment_names, category_names, matrix } = data;
    
    // Thêm tiêu đề
    container.append("h3")
        .style("text-align", "center")
        .style("margin-bottom", "16px")
        .style("font-size", "18px") // Thu nhỏ kích thước chữ
        .style("font-weight", "bold") // In đậm chữ
        .text("Phân bố doanh số theo phân khúc khách hàng và nhóm hàng");
    
    // Tạo bảng phân bố doanh số
    const tableContainer = container.append("div")
        .style("max-width", "100%")
        .style("overflow-x", "auto");
    
    const table = tableContainer.append("table")
        .style("width", "100%")
        .style("border-collapse", "collapse")
        .style("font-family", "Arial, sans-serif")
        .style("margin", "0 auto")
        .style("box-shadow", "0 2px 10px rgba(0,0,0,0.1)");
    
    // Tạo header
    const thead = table.append("thead");
    const headerRow = thead.append("tr")
        .style("background-color", "#f2f2f2");
    
    // Thêm ô header đầu tiên (góc trên bên trái)
    headerRow.append("th")
        .text("Mã PKKH")
        .style("padding", "8px 12px")
        .style("border", "1px solid #ddd")
        .style("text-align", "center")
        .style("font-weight", "bold");
    
    // Thêm các ô header cho các nhóm hàng
    categories.forEach(category => {
        headerRow.append("th")
            .text(category)
            .style("padding", "8px 12px")
            .style("border", "1px solid #ddd")
            .style("text-align", "center")
            .style("font-weight", "bold");
    });
    
    // Tạo body
    const tbody = table.append("tbody");
    
    // Thêm dữ liệu vào bảng
    matrix.forEach(row => {
        const tr = tbody.append("tr");
        
        // Thêm ô đầu tiên (mã phân khúc)
        tr.append("td")
            .text(row.segment_code)
            .style("padding", "8px 12px")
            .style("border", "1px solid #ddd")
            .style("font-weight", "bold")
            .style("text-align", "center")
            .style("background-color", "#f9f9f9");
        
        // Thêm các ô giá trị phần trăm
        categories.forEach(category => {
            const percentage = row.categories[category]?.percentage || 0;
            
            // Xác định màu nền dựa trên giá trị phần trăm
            let cellColor;
            if (percentage >= 40) {
                cellColor = "#ff9999"; // Đỏ nhạt
            } else if (percentage >= 20) {
                cellColor = "#ffffb2"; // Vàng nhạt
            } else if (percentage >= 15) {
                cellColor = "#b3e6b3"; // Xanh lá nhạt
            } else {
                cellColor = "#d9edf7"; // Xanh dương nhạt
            }
            
            tr.append("td")
                .text(`${percentage.toFixed(1)}%`)
                .style("padding", "8px 12px")
                .style("border", "1px solid #ddd")
                .style("text-align", "center")
                .style("background-color", cellColor);
        });
    });
    
    // Thêm chú thích màu sắc
    const legendContainer = container.append("div")
        .style("margin-top", "20px")
        .style("display", "flex")
        .style("justify-content", "center")
        .style("gap", "20px");
    
    // Thêm các mục chú thích
    const legendItems = [
        { color: "#d9edf7", range: "<15%" },
        { color: "#b3e6b3", range: "15-20%" },
        { color: "#ffffb2", range: "20-40%" },
        { color: "#ff9999", range: "≥40%" }
    ];
    
    legendItems.forEach(item => {
        legendContainer.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "5px")
            .html(`
                <div style="width: 20px; height: 20px; background-color: ${item.color}; border: 1px solid #ccc;"></div>
                <span>${item.range}</span>
            `);
    });
    
    // Thêm giải thích
    container.append("p")
        .style("margin-top", "15px")
        .style("text-align", "center")
        .style("font-style", "italic")
        .style("color", "#666")
        .text("Bảng trên hiển thị phần trăm doanh số của mỗi nhóm hàng trong tổng doanh số của từng phân khúc khách hàng.");
}
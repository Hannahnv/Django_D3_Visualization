import csv
from datetime import datetime
from django.shortcuts import render, redirect
from django.contrib import messages
from django.db import transaction
from django.http import JsonResponse
from django.db.models import Sum, Count, Value, CharField, F
from .models import Customer, Product, Order, OrderDetail, Segment, Category
from django.db.models.functions import ExtractMonth, ExtractWeekDay, TruncDate, ExtractDay, ExtractYear, ExtractHour, Concat

# Chuyển đổi an toàn cho số nguyên
def safe_int(value):
    try:
        return int(value)
    except (ValueError, TypeError):
        return None

def upload_csv(request):
    if request.method == "POST" and request.FILES.get("csv_file"):
        csv_file = request.FILES["csv_file"]

        if not csv_file.name.endswith(".csv"):
            messages.error(request, "Vui lòng tải lên tệp CSV hợp lệ.")
            return redirect("upload_csv")

        decoded_file = csv_file.read().decode("utf-8").splitlines()
        reader = csv.DictReader(decoded_file)

        # Bộ đếm
        total_rows = 0
        skipped_rows = 0
        error_details = []

        try:
            with transaction.atomic():
                for row in reader:
                    total_rows += 1  # Đếm tổng số dòng

                    try:
                        # Xử lý ngày tạo đơn
                        date_str = row.get("Thời gian tạo đơn", "").strip()
                        try:
                            created_at = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                        except ValueError:
                            error_details.append(f"Dòng {total_rows}: Lỗi định dạng ngày ({date_str}).")
                            skipped_rows += 1
                            continue

                        # Tạo Segment (Phân khúc)
                        segment_code = row.get("Mã PKKH", "").strip()
                        segment, _ = Segment.objects.get_or_create(
                            segment_code=segment_code,
                            defaults={"description": row.get("Mô tả Phân Khúc Khách hàng", "").strip()}
                        )

                        # Tạo Customer (Khách hàng)
                        customer_code = row.get("Mã khách hàng", "").strip()
                        if not customer_code:
                            error_details.append(f"Dòng {total_rows}: Thiếu mã khách hàng.")
                            skipped_rows += 1
                            continue

                        customer, _ = Customer.objects.get_or_create(
                            customer_code=customer_code,
                            defaults={"name": row.get("Tên khách hàng", "").strip(), "segment": segment}
                        )

                        # Tạo Category (Nhóm hàng)
                        category_code = row.get("Mã nhóm hàng", "").strip()
                        category, _ = Category.objects.get_or_create(
                            category_code=category_code,
                            defaults={"category_name": row.get("Tên nhóm hàng", "").strip()}
                        )

                        # Tạo Product (Sản phẩm)
                        product_code = row.get("Mã mặt hàng", "").strip()
                        if not product_code:
                            error_details.append(f"Dòng {total_rows}: Thiếu mã sản phẩm.")
                            skipped_rows += 1
                            continue

                        product, _ = Product.objects.get_or_create(
                            product_code=product_code,
                            defaults={
                                "product_name": row.get("Tên mặt hàng", "").strip(),
                                "category": category,
                                "unit_price": safe_int(row.get("Đơn giá"))
                            }
                        )

                        # Tạo Order (Đơn hàng)
                        order_code = row.get("Mã đơn hàng", "").strip()
                        order, _ = Order.objects.get_or_create(
                            order_code=order_code,
                            customer=customer,
                            defaults={"created_at": created_at}
                        )

                        # Tạo OrderDetail (Chi tiết đơn hàng)
                        quantity = safe_int(row.get("SL"))
                        price = safe_int(row.get("Đơn giá"))

                        if quantity is None or price is None:
                            error_details.append(f"Dòng {total_rows}: Số lượng hoặc đơn giá không hợp lệ.")
                            skipped_rows += 1
                            continue

                        # Xử lý trùng lặp OrderDetail
                        if not OrderDetail.objects.filter(order=order, product=product).exists():
                            OrderDetail.objects.create(
                                order=order,
                                product=product,
                                quantity=quantity,
                                price=price,
                                total=quantity * price
                            )
                        else:
                            error_details.append(f"Dòng {total_rows}: Chi tiết đơn hàng bị trùng (Order: {order_code}, Product: {product_code}).")
                            skipped_rows += 1

                    except Exception as e:
                        error_details.append(f"Dòng {total_rows}: Lỗi không xác định - {e}")
                        skipped_rows += 1
                        continue

            # Thông báo kết quả
            success_count = total_rows - skipped_rows
            messages.success(request, f"Đã tải lên {success_count} dòng thành công.")
            messages.warning(request, f"Bỏ qua {skipped_rows} dòng do lỗi.")
            
            # In lỗi chi tiết ra console
            if error_details:
                print("\n **Chi tiết các dòng lỗi:**")
                for error in error_details:
                    print(error)

            return redirect("upload_csv")

        except Exception as e:
            messages.error(request, f"Lỗi khi tải lên: {e}")
            return redirect("upload_csv")

    return render(request, "sales/upload.html")

def visualization(request):
    return render(request, 'sales/visualization.html')


# API trả JSON cho từng chart (Q1, Q2, ...)
def chart_data(request, question):
    """Trả dữ liệu JSON theo từng biểu đồ (Q1, Q2, ...)"""
    if question == "Q1":
        # Dữ liệu Q1: Tổng doanh số theo Mã mặt hàng
        data = OrderDetail.objects.values(
            'product__product_code', 'product__product_name',
            'product__category__category_code', 'product__category__category_name'
        ).annotate(total=Sum('total')).order_by('-total')

        # Định dạng JSON
        result = [
            {
                'code': item['product__product_code'],
                'name': item['product__product_name'],
                'groupCode': item['product__category__category_code'],
                'groupName': item['product__category__category_name'],
                'total': item['total']
            }
            for item in data
        ]
    elif question == "Q2":
        # Dữ liệu Q2: Doanh số theo Nhóm hàng
        data = OrderDetail.objects.values(
            'product__category__category_code', 'product__category__category_name'
        ).annotate(total=Sum('total')).order_by('-total')

        result = [
            {
                'groupCode': item['product__category__category_code'],
                'groupName': item['product__category__category_name'],
                'total': item['total']
            }
            for item in data
        ] 
    elif question == "Q3":
        # Dữ liệu Q3: Doanh số theo tháng
        data = (Order.objects.annotate(month=ExtractMonth('created_at')) 
                            .values('month') 
                            .annotate(total=Sum('orderdetail__total')) 
                            .order_by('month')
        )
        result = [{'month': item['month'], 'total': item['total']} for item in data] 
    elif question == "Q4":
    # Mapping cho ngày trong tuần
        map_week = {
            1: "Chủ Nhật",
            2: "Thứ Hai", 
            3: "Thứ Ba",
            4: "Thứ Tư",
            5: "Thứ Năm",
            6: "Thứ Sáu",
            7: "Thứ Bảy"
        }
        
        # Lấy doanh số theo từng ngày và tính trung bình theo ngày trong tuần
        
        # Trước tiên, tính tổng doanh số theo ngày
        daily_sales = OrderDetail.objects.values(
            date=TruncDate('order__created_at')
        ).annotate(
            total=Sum('total'),
            weekday=ExtractWeekDay('order__created_at')
        )
        
        # Tổng hợp theo ngày trong tuần và tính trung bình
        weekday_avg = {} # Doanh số trung bình cho mỗi ngày trong tuần
        weekday_total = {} # Tổng doanh số cho mỗi ngày trong tuần
        weekday_count = {} # Số ngày có doanh số cho mỗi ngày trong tuần
        
        for day in daily_sales:
            wd = day['weekday']
            if wd not in weekday_total:
                weekday_total[wd] = 0
                weekday_count[wd] = 0
            
            weekday_total[wd] += day['total']
            weekday_count[wd] += 1
        
        for wd in weekday_total:
            weekday_avg[wd] = weekday_total[wd] / weekday_count[wd]
        
        # Chuyển thành kết quả JSON
        result = [
            {
                'day': map_week[wd],
                'avgRevenue': round(weekday_avg[wd], 0)
            }
            for wd in weekday_avg if wd in map_week
        ]
        
        # Sắp xếp theo thứ tự
        ordered_days = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]
        result = sorted(result, key=lambda x: ordered_days.index(x['day']))
    elif question == "Q5":
        # Tính tổng doanh thu theo ngày trong tháng
        sales_data = OrderDetail.objects.annotate(
            day=ExtractDay('order__created_at')
        ).values('day').annotate(
            totalRevenue=Sum('total')
        )

        # Đếm số lượng THÁNG mà mỗi ngày có giao dịch
        months_per_day = Order.objects.annotate(
            day=ExtractDay('created_at'),
            month=ExtractMonth('created_at'),
            year=ExtractYear('created_at')
        ).values('day').annotate(
            monthCount=Count(
                Concat('year', Value('-'), 'month', output_field=CharField()),
                distinct=True
            )
        )

        # Chuyển thành dictionary để dễ tra cứu
        months_per_day_map = {item['day']: item['monthCount'] for item in months_per_day}

        # Tính doanh thu trung bình
        result = [
            {
                'day': item['day'],
                'avgRevenue': round(item['totalRevenue'] / months_per_day_map[item['day']], 0)
                if months_per_day_map.get(item['day'], 0) > 0 else 0
            }
            for item in sales_data
        ]

        # Sắp xếp theo ngày trong tháng (1 - 31)
        result = sorted(result, key=lambda x: x['day'])
    elif question == "Q6":
        # Tính tổng doanh thu theo khung giờ
        data = OrderDetail.objects.annotate(
            hour=ExtractHour('order__created_at')
        ).values('hour').annotate(
            total=Sum('total')
        ).order_by('hour')
        
        # Đếm số ngày có giao dịch cho TỪNG khung giờ
        unique_days_per_hour_data = Order.objects.annotate(
            hour=ExtractHour('created_at'),
            date=TruncDate('created_at')
        ).values('hour').annotate(
            day_count=Count('date', distinct=True)
        )
        
        # Chuyển thành dictionary để dễ tra cứu
        unique_days_map = {item['hour']: item['day_count'] for item in unique_days_per_hour_data}
        
        # Tính doanh số trung bình theo giờ
        result = [
            {
                'hour': item['hour'],
                'avgRevenue': round(item['total'] / unique_days_map[item['hour']], 0) 
                if unique_days_map.get(item['hour'], 0) > 0 else 0
            }
            for item in data
        ]
    elif question == "Q7":
                # Lấy tổng số đơn hàng duy nhất
        grand_total_orders = Order.objects.count()

        # Lấy dữ liệu số lượng đơn hàng theo nhóm hàng
        data = OrderDetail.objects.values(
            'product__category__category_code', 'product__category__category_name'
        ).annotate(unique_orders=Count('order', distinct=True)) \
         .order_by('-unique_orders')

        # Tính xác suất bán hàng cho mỗi nhóm hàng
        result = [
            {
                'groupCode': item['product__category__category_code'],
                'groupName': item['product__category__category_name'],
                'probability': item['unique_orders'] / grand_total_orders if grand_total_orders > 0 else 0
            }
            for item in data
        ]
    elif question == "Q8":
        # Lấy tổng số đơn hàng duy nhất theo từng tháng
        total_orders_per_month = Order.objects.annotate(
            month=ExtractMonth('created_at')
        ).values('month').annotate(unique_orders=Count('id', distinct=True))

        # Chuyển thành dictionary {month: total_orders}
        total_orders_dict = {item['month']: item['unique_orders'] for item in total_orders_per_month}

        # Lấy số lượng đơn hàng theo nhóm hàng và tháng
        data = OrderDetail.objects.annotate(month=ExtractMonth('order__created_at')) \
            .values('month', 'product__category__category_code', 'product__category__category_name') \
            .annotate(unique_orders=Count('order', distinct=True)) \
            .order_by('month', '-unique_orders')

        # Tính xác suất bán hàng cho mỗi nhóm hàng theo tháng
        result = []
        for item in data:
            month = item['month']
            total_orders = total_orders_dict.get(month, 1)  # Tránh chia cho 0
            probability = item['unique_orders'] / total_orders if total_orders > 0 else 0

            result.append({
                'month': month,
                'groupCode': item['product__category__category_code'],
                'groupName': item['product__category__category_name'],
                'probability': probability
            })
    elif question == "Q9":
        # Tạo dictionary để lưu trữ kết quả
        result_dict = {}
        
        # Bước 1: Đếm tổng số đơn hàng duy nhất cho mỗi danh mục
        category_orders = {}
        category_names = {}  # Thêm dictionary để lưu tên nhóm hàng
        
        # Lấy tên danh mục
        categories = Category.objects.all()
        for category in categories:
            category_names[category.category_code] = category.category_name
        
        category_orders_data = OrderDetail.objects.values(
            'product__category__category_code'
        ).annotate(
            total_orders=Count('order__order_code', distinct=True)
        )
        
        for item in category_orders_data:
            category_code = item['product__category__category_code']
            category_orders[category_code] = item['total_orders']
        
        # Bước 2: Lấy dữ liệu chi tiết sản phẩm và số lượng đơn hàng cho từng sản phẩm
        product_data = OrderDetail.objects.values(
            'product__category__category_code',
            'product__product_code',
            'product__product_name'
        ).annotate(
            order_count=Count('order__order_code', distinct=True)
        ).order_by('product__category__category_code')
        
        # Bước 3: Tính xác suất và xây dựng kết quả
        for item in product_data:
            category_code = item['product__category__category_code']
            product_code = item['product__product_code']
            product_name = item['product__product_name']
            product_order_count = item['order_count']
            
            # Lấy tên nhóm hàng
            category_name = category_names.get(category_code, "Unknown Category")
            
            # Số đơn hàng trong danh mục
            total_category_orders = category_orders.get(category_code, 1)  # Mặc định 1 để tránh chia cho 0
            
            # Tính xác suất
            probability = product_order_count / total_category_orders
            
            # Thêm vào dictionary kết quả
            if category_code not in result_dict:
                result_dict[category_code] = {
                    "group_code": category_code,
                    "group_name": category_name,  # Thêm tên nhóm hàng
                    "products": []
                }
            
            # Kiểm tra xem sản phẩm đã tồn tại chưa để tránh trùng lặp
            product_exists = False
            for prod in result_dict[category_code]["products"]:
                if prod["product_code"] == product_code:
                    product_exists = True
                    break
            
            if not product_exists:
                result_dict[category_code]["products"].append({
                    "group_code": category_code,
                    "group_name": category_name,  # Thêm tên nhóm hàng
                    "product_code": product_code,
                    "product_name": product_name,
                    "probability": probability
                })
        
        # Chuyển dictionary thành list cho kết quả cuối cùng
        result = list(result_dict.values())
    elif question == "Q10":
        # Tối ưu query bằng select_related để giảm số lượng truy vấn database
        # Lấy tổng số lượng đơn hàng duy nhất theo tháng và nhóm hàng bằng một query duy nhất
        monthly_group_orders = OrderDetail.objects.select_related(
            'order', 'product', 'product__category'
        ).annotate(
            month=ExtractMonth('order__created_at'),
            category_code=F('product__category__category_code')
        ).values('month', 'category_code').annotate(
            order_count=Count('order', distinct=True)
        ).order_by('month', 'category_code')
        
        # Lấy số lượng đơn hàng theo sản phẩm trong mỗi tháng trong cùng một query
        product_orders = OrderDetail.objects.select_related(
            'order', 'product', 'product__category'
        ).annotate(
            month=ExtractMonth('order__created_at')
        ).values(
            'month',
            'product__product_code',
            'product__product_name',
            'product__category__category_code',
            'product__category__category_name'
        ).annotate(
            order_count=Count('order', distinct=True)
        ).order_by('product__category__category_code', 'product__product_code', 'month')
        
        # Chuyển đổi dữ liệu tổng số đơn hàng thành dictionary
        monthly_group_order_dict = {}
        for item in monthly_group_orders:
            month = item['month']
            category_code = item['category_code']
            if month not in monthly_group_order_dict:
                monthly_group_order_dict[month] = {}
            monthly_group_order_dict[month][category_code] = item['order_count']
        
        # Tối ưu bằng cách tạo dictionary trước để tránh tìm kiếm lặp đi lặp lại
        result = {}
        
        # Xử lý dữ liệu sản phẩm - tối ưu hóa việc tạo cấu trúc dữ liệu
        for item in product_orders:
            month = item['month']
            category_code = item['product__category__category_code']
            category_name = item['product__category__category_name']
            product_code = item['product__product_code']
            product_name = item['product__product_name']
            product_orders = item['order_count']
            
            # Tính xác suất
            total_group_month_orders = monthly_group_order_dict.get(month, {}).get(category_code, 1)
            probability = product_orders / total_group_month_orders
            
            # Tạo cấu trúc nhóm hàng nếu chưa tồn tại
            if category_code not in result:
                result[category_code] = {
                    'group_code': category_code,
                    'group_name': category_name,
                    'products': {}
                }
            
            # Tạo cấu trúc sản phẩm nếu chưa tồn tại
            if product_code not in result[category_code]['products']:
                result[category_code]['products'][product_code] = {
                    'product_code': product_code,
                    'product_name': product_name,
                    'monthly_data': []
                }
            
            # Thêm dữ liệu tháng
            result[category_code]['products'][product_code]['monthly_data'].append({
                'month': month,
                'probability': probability
            })
        
        # Chuyển đổi từ dictionary sang list
        final_result = []
        for category_code, category_data in result.items():
            category_data['products'] = list(category_data['products'].values())
            final_result.append(category_data)
        
        # Sắp xếp kết quả theo thứ tự chính xác BOT, SET, THO, TMX, TTC
        preferred_order = ['BOT', 'SET', 'THO', 'TMX', 'TTC']
        
        def sort_key(item):
            if item['group_code'] in preferred_order:
                return preferred_order.index(item['group_code'])
            else:
                return len(preferred_order)  # Các nhóm khác sẽ ở cuối
        
        final_result.sort(key=sort_key)
        
        result = final_result
    elif question == "Q11":
        # Tạo truy vấn đếm số lượng đơn hàng của mỗi khách hàng
        customers_with_order_count = Customer.objects.annotate(
            total_orders=Count('order')
        )
        
        # Tạo dictionary để đếm số khách hàng cho mỗi tần suất mua hàng
        frequency_distribution = {}
        for customer in customers_with_order_count:
            order_count = customer.total_orders
            if order_count in frequency_distribution:
                frequency_distribution[order_count] += 1
            else:
                frequency_distribution[order_count] = 1
        
        # Chuyển dictionary thành list kết quả
        result = [
            {'total_orders': order_count, 'count_customers': count}
            for order_count, count in frequency_distribution.items()
        ]
        
        # Sắp xếp kết quả theo số lần mua tăng dần
        result = sorted(result, key=lambda x: x['total_orders'])
    elif question == "Q12":
                # Tính tổng chi tiêu của mỗi khách hàng
        customer_spending = Customer.objects.annotate(total_spent=Sum('order__orderdetail__total')) \
                                            .values('total_spent')

        # Chuyển đổi thành danh sách số tiền đã chi tiêu
        spending_values = [item['total_spent'] for item in customer_spending if item['total_spent'] is not None]

        # Trả về JSON để D3 xử lý
        result = [{'total_spent': spent} for spent in spending_values]

    else:
        result = []

    # Trả về JSON
    return JsonResponse(result, safe=False)

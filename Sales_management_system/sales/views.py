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

    elif question == "Q13":
        # Q13: Số lượng khách hàng theo phân khúc
        segment_customers = Customer.objects.values(
            'segment__segment_code', 'segment__description'
        ).annotate(
            customer_count=Count('id')
        ).order_by('-customer_count')
        
        # Chuyển đổi thành định dạng JSON cho biểu đồ
        result = [
            {
                'segment_code': item['segment__segment_code'] or 'KXĐ',  # Xử lý trường hợp segment là NULL
                'segment_name': item['segment__description'] or 'Không xác định',
                'customer_count': item['customer_count']
            }
            for item in segment_customers
        ]
    elif question == "Q14":
        # Q14: Doanh số theo phân khúc khách hàng
        segment_revenue = OrderDetail.objects.select_related(
            'order__customer__segment'
        ).values(
            'order__customer__segment__segment_code',
            'order__customer__segment__description'
        ).annotate(
            total_revenue=Sum('total')
        ).order_by('-total_revenue')
        
        # Chuyển đổi thành định dạng JSON cho biểu đồ
        result = [
            {
                'segment_code': item['order__customer__segment__segment_code'] or 'KXĐ',
                'segment_name': item['order__customer__segment__description'] or 'Không xác định',
                'total_revenue': item['total_revenue'] or 0
            }
            for item in segment_revenue
        ]
    elif question == "Q15":
        # Bước 1: Xác định tháng cao điểm (tháng có doanh số cao nhất)
        monthly_revenue = OrderDetail.objects.annotate(
            month=ExtractMonth('order__created_at')
        ).values('month').annotate(
            total_revenue=Sum('total')
        ).order_by('-total_revenue')
        
        # Lấy tháng có doanh số cao nhất
        peak_month = monthly_revenue.first()['month'] if monthly_revenue.exists() else None
        
        # Bước 2: Lấy doanh số theo phân khúc khách hàng trong tháng cao điểm
        segment_revenue_peak_month = OrderDetail.objects.select_related(
            'order__customer__segment'
        ).annotate(
            month=ExtractMonth('order__created_at')
        ).filter(
            month=peak_month
        ).values(
            'order__customer__segment__segment_code',
            'order__customer__segment__description'
        ).annotate(
            total_revenue=Sum('total')
        ).order_by('-total_revenue')
        
        # Chuyển đổi thành định dạng JSON cho biểu đồ
        result = [
            {
                'segment_code': item['order__customer__segment__segment_code'] or 'KXĐ',
                'segment_name': item['order__customer__segment__description'] or 'Không xác định',
                'total_revenue': item['total_revenue'] or 0,
                'peak_month': peak_month
            }
            for item in segment_revenue_peak_month
        ]

    elif question == "Q16":
        # Tính giá trị trung bình đơn hàng (AOV) theo phân khúc khách hàng
        segment_aov = Order.objects.select_related('customer__segment').values(
            'customer__segment__segment_code',
            'customer__segment__description'
        ).annotate(
            # Tổng doanh số
            total_revenue=Sum('orderdetail__total'),
            # Số lượng đơn hàng
            order_count=Count('id', distinct=True)
        ).filter(
            order_count__gt=0  # Đảm bảo không chia cho 0
        ).annotate(
            # Tính AOV = Tổng doanh số / Số lượng đơn hàng
            aov=F('total_revenue') / F('order_count')
        ).order_by('-aov')
        
        # Chuyển đổi thành định dạng JSON cho biểu đồ
        result = [
            {
                'segment_code': item['customer__segment__segment_code'] or 'KXĐ',
                'segment_name': item['customer__segment__description'] or 'Không xác định',
                'aov': int(item['aov']) if item['aov'] is not None else 0,
                'order_count': item['order_count'],
                'total_revenue': item['total_revenue']
            }
            for item in segment_aov
        ]
    elif question == "Q17":
        # Q17: Doanh số và tăng trưởng theo tháng (line and stacked column chart)
        
        # Lấy doanh số theo tháng
        monthly_revenue = OrderDetail.objects.annotate(
            month=ExtractMonth('order__created_at')
        ).values('month').annotate(
            total_revenue=Sum('total')
        ).order_by('month')
        
        # Chuyển đổi thành list để dễ xử lý
        revenue_data = list(monthly_revenue)
        
        # Tính tăng trưởng giữa các tháng
        result = []
        previous_revenue = None
        
        for i, item in enumerate(revenue_data):
            current_month = item['month']
            current_revenue = item['total_revenue']
            
            # Tính tăng trưởng so với tháng trước
            growth_rate = 0
            if previous_revenue and previous_revenue > 0:
                growth_rate = ((current_revenue - previous_revenue) / previous_revenue) * 100
            
            # Lưu doanh số tháng hiện tại cho lần lặp tiếp theo
            previous_revenue = current_revenue
            
            # Thêm vào kết quả
            result.append({
                'month': current_month,
                'total_revenue': current_revenue,
                'growth_rate': round(growth_rate, 1)  # Làm tròn đến 1 chữ số thập phân
            })

    elif question == "Q18":
        # Q18: Phân bố doanh số theo phân khúc khách hàng và nhóm hàng
        
        # Lấy doanh số theo từng cặp phân khúc và nhóm hàng
        segment_category_revenue = OrderDetail.objects.select_related(
            'order__customer__segment', 
            'product__category'
        ).values(
            'order__customer__segment__segment_code',
            'product__category__category_code',
            'product__category__category_name'
        ).annotate(
            total_revenue=Sum('total')
        )
        
        # Tạo cấu trúc dữ liệu giống pivot table
        pivot_data = {}
        all_categories = set()
        
        # Tổng hợp dữ liệu thô
        for item in segment_category_revenue:
            segment_code = item['order__customer__segment__segment_code'] or 'KXĐ'
            category_code = item['product__category__category_code'] or 'KXĐ'
            category_name = item['product__category__category_name'] or 'Không xác định'
            revenue = item['total_revenue'] or 0
            
            if segment_code not in pivot_data:
                pivot_data[segment_code] = {'total': 0}
            
            # Lưu doanh số cho nhóm hàng
            pivot_data[segment_code][category_code] = revenue
            
            # Cộng vào tổng doanh số của phân khúc
            pivot_data[segment_code]['total'] += revenue
            
            # Thêm nhóm hàng vào danh sách
            all_categories.add(category_code)
        
        # Danh sách nhóm hàng (được sắp xếp)
        categories = sorted(list(all_categories))
        
        # Tính toán tỷ lệ phần trăm
        for segment_code, segment_data in pivot_data.items():
            segment_total = segment_data['total']
            if segment_total > 0:
                for category_code in all_categories:
                    revenue = segment_data.get(category_code, 0)
                    # Tính phần trăm dựa trên tổng doanh số của phân khúc đó (không phải tổng toàn bộ)
                    percentage = (revenue / segment_total) * 100
                    segment_data[f'{category_code}_pct'] = percentage
        
        # Lấy tên các phân khúc khách hàng
        segment_names = {}
        for segment in Segment.objects.all():
            segment_names[segment.segment_code] = segment.description or segment.segment_code
        
        # Lấy tên các nhóm hàng
        category_names = {}
        for category in Category.objects.all():
            category_names[category.category_code] = category.category_name or category.category_code
        
        # Chuyển đổi thành định dạng cho biểu đồ
        matrix = []
        for segment_code, segment_data in pivot_data.items():
            row = {
                'segment_code': segment_code,
                'segment_name': segment_names.get(segment_code, segment_code),
                'total': segment_data['total'],
                'categories': {}
            }
            
            for category_code in categories:
                revenue = segment_data.get(category_code, 0)
                percentage = segment_data.get(f'{category_code}_pct', 0)
                
                row['categories'][category_code] = {
                    'revenue': revenue,
                    'percentage': round(percentage, 2)
                }
            
            matrix.append(row)
        
        # Sắp xếp matrix theo mã phân khúc
        matrix.sort(key=lambda x: x['segment_code'])
        
        # Kết quả trả về
        result = {
            'segments': [row['segment_code'] for row in matrix],
            'categories': categories,
            'segment_names': segment_names,
            'category_names': category_names,
            'matrix': matrix
        }
    elif question == "Q19":
        # Q19: Phân phối chi tiêu theo phân khúc khách hàng (Box Plot)
        
        # Tạo query để tính tổng chi tiêu của mỗi khách hàng theo phân khúc
        customer_spending = OrderDetail.objects.select_related(
            'order__customer', 'order__customer__segment'
        ).values(
            'order__customer__customer_code',
            'order__customer__segment__segment_code'
        ).annotate(
            total_spending=Sum('total')
        ).order_by('order__customer__segment__segment_code')
        
        # Tạo dictionary để lưu trữ dữ liệu theo từng phân khúc
        segment_spending = {}
        
        # Chuyển QuerySet thành dữ liệu cho biểu đồ
        for item in customer_spending:
            segment_code = item['order__customer__segment__segment_code'] or 'KXĐ'
            spending = item['total_spending'] or 0
            
            if segment_code not in segment_spending:
                segment_spending[segment_code] = []
            
            segment_spending[segment_code].append(spending)
        
        # Tính toán thống kê cho mỗi phân khúc
        result = []
        
        for segment_code, spendings in segment_spending.items():
            # Sắp xếp chi tiêu
            sorted_spendings = sorted(spendings)
            n = len(sorted_spendings)
            
            if n > 0:
                # Tính các giá trị thống kê
                min_val = sorted_spendings[0]
                q1 = sorted_spendings[int(n * 0.25)] if n > 3 else min_val
                median = sorted_spendings[int(n * 0.5)] if n > 1 else min_val
                q3 = sorted_spendings[int(n * 0.75)] if n > 3 else min_val
                max_val = sorted_spendings[-1]
                
                # Tính IQR và giới hạn của các outlier
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                
                # Xác định các điểm outlier
                outliers = [s for s in sorted_spendings if s < lower_bound or s > upper_bound]
                
                # Xác định whiskers (không bao gồm outlier)
                non_outliers = [s for s in sorted_spendings if lower_bound <= s <= upper_bound]
                whisker_bottom = non_outliers[0] if non_outliers else min_val
                whisker_top = non_outliers[-1] if non_outliers else max_val
                
                # Thêm thông tin phân khúc vào kết quả
                result.append({
                    'segment_code': segment_code,
                    'min': min_val,
                    'q1': q1,
                    'median': median,
                    'q3': q3,
                    'max': max_val,
                    'whisker_bottom': whisker_bottom,
                    'whisker_top': whisker_top,
                    'outliers': outliers,
                    'raw_data': sorted_spendings  # Thêm dữ liệu thô để vẽ điểm
                })
        
        # Sắp xếp kết quả theo mã phân khúc
        result.sort(key=lambda x: x['segment_code'])
    else:
        result = []
    # Trả về JSON
    return JsonResponse(result, safe=False)

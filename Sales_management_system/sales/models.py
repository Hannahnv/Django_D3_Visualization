from django.db import models

# 1. Bảng Phân khúc khách hàng (Segment)
class Segment(models.Model):
    segment_code = models.CharField(max_length=10, unique=True)  # Mã phân khúc
    description = models.TextField(null=True, blank=True, default="")  # Mô tả phân khúc

    def __str__(self):
        return f"{self.segment_code} - {self.description}"

# 2. Bảng Khách hàng (Customer)
class Customer(models.Model):
    customer_code = models.CharField(max_length=20, unique=True)  # Mã khách hàng
    name = models.CharField(max_length=100, null=True, blank=True, default="")  # Tên khách hàng
    segment = models.ForeignKey(Segment, on_delete=models.SET_NULL, null=True, blank=True)  # Phân khúc

    def __str__(self):
        return f"{self.customer_code} - {self.name}"

# 3. Bảng Nhóm hàng (Category)
class Category(models.Model):
    category_code = models.CharField(max_length=10, unique=True)  # Mã nhóm hàng
    category_name = models.CharField(max_length=100)  # Tên nhóm hàng

    def __str__(self):
        return f"{self.category_code} - {self.category_name}"

# 4. Bảng Sản phẩm (Product)
class Product(models.Model):
    product_code = models.CharField(max_length=10, unique=True)
    product_name = models.CharField(max_length=100)
    category = models.ForeignKey('Category', on_delete=models.SET_NULL, null=True, blank=True)
    unit_price = models.IntegerField()


    def __str__(self):
        return f"{self.product_code} - {self.product_name}"

# 5. Bảng Đơn hàng (Order)
class Order(models.Model):
    order_code = models.CharField(max_length=20, unique=True)  # Mã đơn hàng
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)  # Khách hàng
    created_at = models.DateTimeField()  # Thời gian tạo đơn

    def __str__(self):
        return f"{self.order_code} - {self.customer.name}"

# 6. Bảng Chi tiết đơn hàng (OrderDetail)
class OrderDetail(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)  # Mã đơn hàng
    product = models.ForeignKey(Product, on_delete=models.CASCADE)  # Mã mặt hàng
    quantity = models.IntegerField()  # Số lượng
    price = models.IntegerField()  # Đơn giá
    total = models.IntegerField()  # Thành tiền

    # Tự động tính total khi lưu
    def save(self, *args, **kwargs):
        self.total = self.quantity * self.price
        super(OrderDetail, self).save(*args, **kwargs)

    def __str__(self):
        return f"{self.order.order_code} - {self.product.product_name} x {self.quantity}"

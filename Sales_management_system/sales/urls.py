from django.urls import path, include
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', views.visualization, name='d3_visualization'),  # Trang upload
    path('upload/', views.upload_csv, name='upload_csv'),  # Add this URL pattern
    path('api/chart-data/<str:question>/', views.chart_data, name='chart_data'),  # API cho từng chart
    # path('schema-viewer/', include('schema_viewer.urls')),

] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

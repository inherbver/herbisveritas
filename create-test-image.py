from PIL import Image, ImageDraw

# Create a simple test image
img = Image.new('RGB', (300, 200), color='lightblue')
draw = ImageDraw.Draw(img)
draw.text((50, 90), "Test Image", fill='black')
img.save('test-image.jpg', 'JPEG')
print("Test image created successfully")
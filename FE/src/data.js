import product1 from "./assets/img/product-1.jpg";
import product3 from "./assets/img/product-3.jpg";
import product4 from "./assets/img/product-4.jpg";
import product6 from "./assets/img/product-6.jpg";

export const products = [
  {
    id: 1,
    name: "iPhone 15",
    price: 1200,
    image: product3,
    description:
      "iPhone 15 mang đến hiệu năng mạnh mẽ với chip A16 Bionic, camera cải tiến và thiết kế cao cấp. Phù hợp cho người dùng yêu thích công nghệ và trải nghiệm mượt mà.",
    specs: {
      screen: "6.1 inch OLED",
      chip: "Apple A16 Bionic",
      ram: "6GB",
      storage: "128GB",
      camera: "48MP",
      battery: "3349 mAh"
    }
  },
  {
    id: 2,
    name: "Samsung S24",
    price: 1000,
    image: product6,
    description:
      "Samsung Galaxy S24 sở hữu màn hình Dynamic AMOLED sắc nét, hiệu năng mạnh mẽ và camera AI thông minh giúp bạn chụp ảnh chuyên nghiệp.",
    specs: {
      screen: "6.2 inch Dynamic AMOLED",
      chip: "Snapdragon 8 Gen 3",
      ram: "8GB",
      storage: "256GB",
      camera: "50MP",
      battery: "4000 mAh"
    }
  },
  {
    id: 3,
    name: "Macbook Pro",
    price: 2000,
    image: product4,
    description:
      "MacBook Pro là lựa chọn hoàn hảo cho lập trình viên và designer với chip Apple Silicon mạnh mẽ, màn hình Retina sắc nét và thời lượng pin dài.",
    specs: {
      screen: "14 inch Retina",
      chip: "Apple M3",
      ram: "16GB",
      storage: "512GB SSD",
      battery: "18 hours"
    }
  },
  {
    id: 4,
    name: "Sony TV",
    price: 1500,
    image: product1,
    description:
      "Sony Smart TV mang lại trải nghiệm giải trí đỉnh cao với hình ảnh 4K HDR sắc nét, âm thanh sống động và hệ điều hành thông minh.",
    specs: {
      screen: "55 inch 4K",
      panel: "LED HDR",
      system: "Google TV",
      sound: "Dolby Audio"
    }
  }
];
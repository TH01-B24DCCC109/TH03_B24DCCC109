import React, { createContext, useContext, useMemo, useReducer, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

/**********************
 * Types & Constants  *
 **********************/

type DanhMuc = "Điện tử" | "Quần áo" | "Đồ ăn" | "Sách" | "Khác";

export type Product = {
  id: number;
  ten: string;
  danhMuc: DanhMuc;
  gia: number; // VND
  soLuong: number;
  moTa: string;
};

const CATEGORIES: DanhMuc[] = ["Điện tử", "Quần áo", "Đồ ăn", "Sách", "Khác"];
const PAGE_SIZE = 6;

/******************************
 * Sample data (>= 10 items)  *
 ******************************/
const initialProducts: Product[] = [
  { id: 1, ten: "iPhone 15 Pro", danhMuc: "Điện tử", gia: 25000000, soLuong: 10, moTa: "Flagship Apple, chip A17 Pro." },
  { id: 2, ten: "Áo Thun Nam", danhMuc: "Quần áo", gia: 150000, soLuong: 50, moTa: "Cotton 100%, form regular fit." },
  { id: 3, ten: "Bánh Mì Bơ Tỏi", danhMuc: "Đồ ăn", gia: 35000, soLuong: 120, moTa: "Giòn thơm, làm mới mỗi ngày." },
  { id: 4, ten: "Sách Dạy Nấu Ăn", danhMuc: "Sách", gia: 99000, soLuong: 40, moTa: "Tuyển tập công thức dễ làm." },
  { id: 5, ten: "Tai Nghe Bluetooth", danhMuc: "Điện tử", gia: 790000, soLuong: 35, moTa: "Bluetooth 5.3, chống ồn chủ động." },
  { id: 6, ten: "Quần Jean Slim", danhMuc: "Quần áo", gia: 399000, soLuong: 28, moTa: "Denim co giãn, xanh đậm." },
  { id: 7, ten: "Cơm Gà Xối Mỡ", danhMuc: "Đồ ăn", gia: 45000, soLuong: 60, moTa: "Suất ăn nóng, gà giòn rụm." },
  { id: 8, ten: "Sách Kinh Tế Học", danhMuc: "Sách", gia: 159000, soLuong: 22, moTa: "Nhập môn kinh tế (bản mới)." },
  { id: 9, ten: "Bình Giữ Nhiệt", danhMuc: "Khác", gia: 199000, soLuong: 45, moTa: "Giữ nóng/lạnh 6-8h, 500ml." },
  { id: 10, ten: "Chuột Không Dây", danhMuc: "Điện tử", gia: 259000, soLuong: 70, moTa: "2.4G + BT, DPI 800-1600-2400." },
  { id: 11, ten: "Áo Khoác Hoodie", danhMuc: "Quần áo", gia: 499000, soLuong: 15, moTa: "Nỉ dày, có mũ, unisex." },
];

/************************
 * Context + useReducer *
 ************************/

type Action =
  | { type: "add"; payload: Omit<Product, "id"> }
  | { type: "update"; payload: Product }
  | { type: "delete"; payload: { id: number } }
  | { type: "hydrate"; payload: Product[] };

type ProductState = { products: Product[]; nextId: number };

const reducer = (state: ProductState, action: Action): ProductState => {
  switch (action.type) {
    case "hydrate": {
      const maxId = action.payload.reduce((m, p) => Math.max(m, p.id), 0);
      return { products: action.payload, nextId: maxId + 1 };
    }
    case "add": {
      const newProduct: Product = { id: state.nextId, ...action.payload };
      const products = [newProduct, ...state.products];
      persist(products);
      return { products, nextId: state.nextId + 1 };
    }
    case "update": {
      const products = state.products.map((p) => (p.id === action.payload.id ? action.payload : p));
      persist(products);
      return { ...state, products };
    }
    case "delete": {
      const products = state.products.filter((p) => p.id !== action.payload.id);
      persist(products);
      return { ...state, products };
    }
    default:
      return state;
  }
};

// LocalStorage helpers
const LS_KEY = "product_app_state_v1";
const persist = (products: Product[]) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(products));
  } catch {}
};
const loadFromStorage = (): Product[] | null => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Product[];
  } catch {
    return null;
  }
};

// Context

type ProductContextType = {
  products: Product[];
  add: (p: Omit<Product, "id">) => void;
  update: (p: Product) => void;
  remove: (id: number) => void;
};

const ProductContext = createContext<ProductContextType | null>(null);

const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, { products: [], nextId: 1 });

  useEffect(() => {
    const fromLS = loadFromStorage();
    dispatch({ type: "hydrate", payload: fromLS && fromLS.length ? fromLS : initialProducts });
  }, []);

  const value = useMemo(() => ({
    products: state.products,
    add: (p: Omit<Product, "id">) => dispatch({ type: "add", payload: p }),
    update: (p: Product) => dispatch({ type: "update", payload: p }),
    remove: (id: number) => dispatch({ type: "delete", payload: { id } }),
  }), [state.products]);

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};

const useProducts = () => {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error("useProducts must be used within ProductProvider");
  return ctx;
};

/****************
 * UI Utilities *
 ****************/

const VND = (n: number) => n.toLocaleString("vi-VN");

const Card: React.FC<{ children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...rest }) => (
  <div className={`rounded-2xl shadow p-4 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 ${className}`} {...rest}>
    {children}
  </div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", ...props }) => (
  <button
    className={`px-3 py-2 rounded-xl shadow text-sm font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${className}`}
    {...props}
  />
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = "", ...props }) => (
  <input
    className={`w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
    {...props}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = "", children, ...props }) => (
  <select
    className={`w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
    {...props}
  >
    {children}
  </select>
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = "", ...props }) => (
  <textarea
    className={`w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
    {...props}
  />
);

/***********************
 * Search & Filter Bar *
 ***********************/

type FilterState = {
  q: string;
  danhMuc: "" | DanhMuc;
  min: string;
  max: string;
};

const useFilterParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const state: FilterState = {
    q: searchParams.get("q") ?? "",
    danhMuc: (searchParams.get("danhMuc") as DanhMuc | null) ?? "",
    min: searchParams.get("min") ?? "",
    max: searchParams.get("max") ?? "",
  };
  const set = (patch: Partial<FilterState>) => {
    const next = { ...state, ...patch };
    const sp = new URLSearchParams();
    if (next.q) sp.set("q", next.q);
    if (next.danhMuc) sp.set("danhMuc", next.danhMuc);
    if (next.min) sp.set("min", next.min);
    if (next.max) sp.set("max", next.max);
    setSearchParams(sp, { replace: true });
  };
  return [state, set] as const;
};

const SearchFilterBar: React.FC = () => {
  const [f, setF] = useFilterParams();
  return (
    <Card className="mb-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <label className="text-sm text-zinc-500">Tìm kiếm tên</label>
          <Input
            placeholder="Nhập tên sản phẩm..."
            value={f.q}
            onChange={(e) => setF({ q: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-zinc-500">Danh mục</label>
          <Select value={f.danhMuc} onChange={(e) => setF({ danhMuc: e.target.value as DanhMuc | "" })}>
            <option value="">Tất cả</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm text-zinc-500">Giá tối thiểu</label>
          <Input type="number" min={0} value={f.min} onChange={(e) => setF({ min: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-zinc-500">Giá tối đa</label>
          <Input type="number" min={0} value={f.max} onChange={(e) => setF({ max: e.target.value })} />
        </div>
      </div>
    </Card>
  );
};

/****************
 * Pagination   *
 ****************/

const Pagination: React.FC<{
  total: number;
  page: number;
  onPage: (p: number) => void;
}> = ({ total, page, onPage }) => {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-between gap-3 mt-4">
      <div className="text-sm text-zinc-500">Tổng: <b>{total}</b> sản phẩm • Trang <b>{page}</b> / {totalPages}</div>
      <div className="flex items-center gap-2">
        <Button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</Button>
        <div className="flex items-center gap-1">
          {pages.map((p) => (
            <Button key={p} className={`${p === page ? "bg-indigo-600 text-white" : ""}`} onClick={() => onPage(p)}>
              {p}
            </Button>
          ))}
        </div>
        <Button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next</Button>
      </div>
    </div>
  );
};

/****************
 * Product Card *
 ****************/

const ProductCard: React.FC<{ p: Product; onDelete: (id: number) => void }> = ({ p, onDelete }) => {
  const navigate = useNavigate();
  return (
    <Card className="h-full flex flex-col">
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold leading-tight">{p.ten}</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">{p.danhMuc}</span>
        </div>
        <div className="mt-2 text-zinc-500 text-sm line-clamp-3">{p.moTa}</div>
        <div className="mt-3 text-base font-medium">{VND(p.gia)} đ</div>
        <div className="text-xs text-zinc-500">Số lượng: {p.soLuong}</div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={() => navigate(`/products/${p.id}`)}>Chi tiết</Button>
        <Button className="flex-1" onClick={() => navigate(`/edit/${p.id}`)}>Sửa</Button>
        <Button className="flex-1 text-red-600 border-red-300" onClick={() => onDelete(p.id)}>Xóa</Button>
      </div>
    </Card>
  );
};

/****************
 * Product List *
 ****************/

const ProductListPage: React.FC = () => {
  const { products, remove } = useProducts();
  const [f] = useFilterParams();
  const [page, setPage] = useState(1);

  // Filter + search
  const filtered = useMemo(() => {
    let list = products;
    if (f.q.trim()) {
      const q = f.q.toLowerCase();
      list = list.filter((p) => p.ten.toLowerCase().includes(q));
    }
    if (f.danhMuc) list = list.filter((p) => p.danhMuc === f.danhMuc);
    const min = f.min ? Number(f.min) : undefined;
    const max = f.max ? Number(f.max) : undefined;
    if (min != null && !Number.isNaN(min)) list = list.filter((p) => p.gia >= min);
    if (max != null && !Number.isNaN(max)) list = list.filter((p) => p.gia <= max);
    return list;
  }, [products, f.q, f.danhMuc, f.min, f.max]);

  useEffect(() => {
    setPage(1); // reset page when filter changes
  }, [f.q, f.danhMuc, f.min, f.max]);

  const total = filtered.length;
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const onDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa sản phẩm này?")) remove(id);
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Header />
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold">Danh sách sản phẩm</h2>
        <Link to="/add" className="px-3 py-2 rounded-xl bg-indigo-600 text-white shadow">+ Thêm sản phẩm</Link>
      </div>

      <SearchFilterBar />

      {total === 0 ? (
        <Card>
          <div className="text-center text-zinc-500">Không có sản phẩm nào phù hợp.</div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pageItems.map((p) => (
              <ProductCard key={p.id} p={p} onDelete={onDelete} />
            ))}
          </div>
          <Pagination total={total} page={page} onPage={setPage} />
        </>
      )}
    </div>
  );
};

/****************
 * Product Form *
 ****************/

type FormValues = {
  ten: string;
  danhMuc: "" | DanhMuc;
  gia: string;
  soLuong: string;
  moTa: string;
};

type ProductFormProps =
  | { mode: "add"; initial?: undefined; onSubmit: (p: Omit<Product, "id">) => void }
  | { mode: "edit"; initial: Product; onSubmit: (p: Product) => void };

const validate = (v: FormValues) => {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!v.ten.trim()) errors.ten = "Tên sản phẩm là bắt buộc";
  else if (v.ten.trim().length < 3) errors.ten = "Tên tối thiểu 3 ký tự";

  if (!v.danhMuc) errors.danhMuc = "Vui lòng chọn danh mục";

  const gia = Number(v.gia);
  if (!v.gia) errors.gia = "Giá là bắt buộc";
  else if (Number.isNaN(gia) || gia <= 0) errors.gia = "Giá phải là số dương";

  const soLuong = Number(v.soLuong);
  if (!v.soLuong) errors.soLuong = "Số lượng là bắt buộc";
  else if (!Number.isInteger(soLuong) || soLuong <= 0) errors.soLuong = "Số lượng phải là số nguyên dương";

  if (!v.moTa.trim()) errors.moTa = "Mô tả là bắt buộc";

  return errors;
};

const ProductForm: React.FC<ProductFormProps> = ({ mode, initial, onSubmit }) => {
  const [v, setV] = useState<FormValues>(() => initial ? {
    ten: initial.ten,
    danhMuc: initial.danhMuc,
    gia: String(initial.gia),
    soLuong: String(initial.soLuong),
    moTa: initial.moTa,
  } : { ten: "", danhMuc: "", gia: "", soLuong: "", moTa: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errs = validate(v);

  const set = (patch: Partial<FormValues>) => setV((s) => ({ ...s, ...patch }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(errs).length) {
      setTouched({ ten: true, danhMuc: true, gia: true, soLuong: true, moTa: true });
      return;
    }
    if (mode === "add") {
      onSubmit({ ten: v.ten.trim(), danhMuc: v.danhMuc as DanhMuc, gia: Number(v.gia), soLuong: Number(v.soLuong), moTa: v.moTa.trim() });
    } else if (mode === "edit" && initial) {
      onSubmit({ id: initial.id, ten: v.ten.trim(), danhMuc: v.danhMuc as DanhMuc, gia: Number(v.gia), soLuong: Number(v.soLuong), moTa: v.moTa.trim() });
    }
  };

  const errMsg = (key: keyof FormValues) => touched[key] && errs[key] ? (
    <div className="text-xs text-red-600 mt-1">{errs[key]}</div>
  ) : null;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-sm text-zinc-500">Tên sản phẩm *</label>
        <Input value={v.ten} onBlur={() => setTouched((t) => ({ ...t, ten: true }))} onChange={(e) => set({ ten: e.target.value })} />
        {errMsg("ten")}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-zinc-500">Danh mục *</label>
          <Select value={v.danhMuc} onBlur={() => setTouched((t) => ({ ...t, danhMuc: true }))} onChange={(e) => set({ danhMuc: e.target.value as DanhMuc | "" })}>
            <option value="">-- Chọn danh mục --</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          {errMsg("danhMuc")}
        </div>
        <div>
          <label className="text-sm text-zinc-500">Giá (VND) *</label>
          <Input type="number" min={0} value={v.gia} onBlur={() => setTouched((t) => ({ ...t, gia: true }))} onChange={(e) => set({ gia: e.target.value })} />
          {errMsg("gia")}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-zinc-500">Số lượng *</label>
          <Input type="number" min={1} value={v.soLuong} onBlur={() => setTouched((t) => ({ ...t, soLuong: true }))} onChange={(e) => set({ soLuong: e.target.value })} />
          {errMsg("soLuong")}
        </div>
        <div>
          <label className="text-sm text-zinc-500">Mô tả *</label>
          <Textarea rows={4} value={v.moTa} onBlur={() => setTouched((t) => ({ ...t, moTa: true }))} onChange={(e) => set({ moTa: e.target.value })} />
          {errMsg("moTa")}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="bg-indigo-600 text-white">{mode === "add" ? "Thêm" : "Cập nhật"}</Button>
        <Link to="/" className="px-3 py-2 rounded-xl border border-zinc-300">Hủy</Link>
      </div>
    </form>
  );
};

/****************
 * Add / Edit   *
 ****************/

const AddPage: React.FC = () => {
  const { add } = useProducts();
  const nav = useNavigate();
  const onSubmit = (p: Omit<Product, "id">) => {
    add(p);
    nav("/");
  };
  return (
    <div className="max-w-3xl mx-auto p-4">
      <Header />
      <h2 className="text-2xl font-bold mb-3">Thêm sản phẩm</h2>
      <Card>
        <ProductForm mode="add" onSubmit={onSubmit} />
      </Card>
    </div>
  );
};

const EditPage: React.FC = () => {
  const { products, update } = useProducts();
  const { id } = useParams();
  const nav = useNavigate();
  const product = products.find((p) => p.id === Number(id));
  if (!product) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Header />
        <Card>
          <div className="text-red-600">Không tìm thấy sản phẩm #{id}</div>
        </Card>
      </div>
    );
  }
  const onSubmit = (p: Product) => {
    update(p);
    nav(`/products/${p.id}`);
  };
  return (
    <div className="max-w-3xl mx-auto p-4">
      <Header />
      <h2 className="text-2xl font-bold mb-3">Chỉnh sửa sản phẩm</h2>
      <Card>
        <ProductForm mode="edit" initial={product} onSubmit={onSubmit} />
      </Card>
    </div>
  );
};

/****************
 * Detail Page  *
 ****************/

const DetailPage: React.FC = () => {
  const { products, remove } = useProducts();
  const { id } = useParams();
  const nav = useNavigate();
  const p = products.find((x) => x.id === Number(id));
  if (!p) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Header />
        <Card>
          <div className="text-red-600">Không tìm thấy sản phẩm #{id}</div>
        </Card>
      </div>
    );
  }
  const onDelete = () => {
    if (confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
      remove(p.id);
      nav("/");
    }
  };
  return (
    <div className="max-w-3xl mx-auto p-4">
      <Header />
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold">{p.ten}</h2>
        <div className="flex gap-2">
          <Button onClick={() => nav(`/edit/${p.id}`)}>Sửa</Button>
          <Button className="text-red-600 border-red-300" onClick={onDelete}>Xóa</Button>
        </div>
      </div>
      <Card>
        <div className="space-y-3">
          <div className="text-sm"><span className="text-zinc-500">Danh mục:</span> <b>{p.danhMuc}</b></div>
          <div className="text-sm"><span className="text-zinc-500">Giá:</span> <b>{VND(p.gia)} đ</b></div>
          <div className="text-sm"><span className="text-zinc-500">Số lượng:</span> <b>{p.soLuong}</b></div>
          <div>
            <div className="text-sm text-zinc-500 mb-1">Mô tả</div>
            <div className="whitespace-pre-wrap">{p.moTa}</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

/****************
 * Layout/Header *
 ****************/

const Header: React.FC = () => (
  <div className="mb-4">
    <div className="flex items-center justify-between">
      <Link to="/" className="text-xl font-bold">🛒 Product Manager</Link>
      <div className="flex items-center gap-2 text-sm">
        <Link to="/" className="px-3 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">Trang chủ</Link>
        <Link to="/add" className="px-3 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">Thêm</Link>
      </div>
    </div>
  </div>
);

/*************
 * Home Page *
 *************/

const HomePage: React.FC = () => <ProductListPage />;

/********
 * App  *
 ********/

const Shell: React.FC = () => (
  <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products/:id" element={<DetailPage />} />
      <Route path="/add" element={<AddPage />} />
      <Route path="/edit/:id" element={<EditPage />} />
      <Route path="*" element={<div className="p-6">404 - Không tìm thấy trang</div>} />
    </Routes>
  </div>
);

export default function App() {
  return (
    <ProductProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </ProductProvider>
  );
}

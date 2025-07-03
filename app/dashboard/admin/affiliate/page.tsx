// src/app/affiliate/admin/page.tsx
"use client";

import { useState, useEffect, useMemo, FC, FormEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';
import { AffiliateProduct } from '@/lib/types';
import { supabase } from '@/lib/supabase/supabaseClient';
import { toast } from 'sonner';
import Link from 'next/link';

// UI Components (Ensure these are correctly installed and imported from your shadcn/ui setup)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const ProductCard: FC<{
  product: AffiliateProduct;
  onEdit: (product: AffiliateProduct) => void;
  onDelete: (id: string) => void;
}> = ({ product, onEdit, onDelete }) => (
  <Card className="flex flex-col h-full">
    <CardHeader>
      <CardTitle className="flex justify-between items-start">
        <span className="truncate pr-2">{product.title}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(product)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-red-500">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardTitle>
      <CardDescription className="line-clamp-2">{product.description}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4 flex-grow">
      {product.imageUrl && (
        <div className="relative h-40 w-full overflow-hidden rounded-md">
          <Image src={product.imageUrl} alt={product.title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
        </div>
      )}
      <div className="flex justify-between items-center text-sm">
        <span className="font-semibold">Commission Rate:</span>
        <span className="font-mono text-lg">{product.baseCommission || 0}%</span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="font-semibold">Price:</span>
        {product.price === undefined || product.price === null ? (
          <Badge variant="destructive">Missing</Badge>
        ) : (
          <span className="font-mono text-lg">₦{product.price.toFixed(2)}</span>
        )}
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="font-semibold">Status:</span>
        <Badge variant={product.isActive ? 'default' : 'secondary'}>
          {product.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>
    </CardContent>
    <CardFooter className="flex-col items-start gap-2 text-xs text-muted-foreground">
      <p>Total Clicks: {product.totalClicks}</p>
      <p>Total Earnings: ₦{product.totalEarnings.toFixed(2)}</p>
    </CardFooter>
  </Card>
);

export default function AffiliateAdminPage() {
  const { user, idToken, isLoading: isAuthLoading } = useAuth(); // Destructure isLoading from useAuth
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true); // Renamed for clarity
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<AffiliateProduct> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // --- Fetch Products ---
  const fetchProducts = async () => {
    // Only attempt to fetch if auth is not loading and idToken is present
    if (isAuthLoading) {
      console.log("AffiliateAdminPage: fetchProducts - Auth is still loading. Skipping fetch.");
      return;
    }
    if (!idToken) {
      console.warn("AffiliateAdminPage: fetchProducts - No ID token available after auth load. User might not be logged in or session expired.");
      setIsLoadingProducts(false); // Ensure loading state is cleared
      toast.error("Authentication required to fetch products. Please log in.");
      return;
    }
    setIsLoadingProducts(true); // Use specific loading state for products
    try {
      console.log("AffiliateAdminPage: Fetching products...");
      const response = await fetch('/api/admin/affiliate-products', {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch products');
      }
      const data: AffiliateProduct[] = await response.json();
      setProducts(data);
      toast.success("Products loaded successfully!");
    } catch (error: any) {
      console.error("AffiliateAdminPage: Error fetching products:", error);
      toast.error('Error fetching products', { description: error.message });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    // Fetch products once auth state is settled and token is available
    if (!isAuthLoading && idToken) {
      fetchProducts();
    } else if (!isAuthLoading && !idToken) {
      // Auth finished loading, but no token means user is not authenticated
      console.log("AffiliateAdminPage: User is not authenticated. Cannot fetch products.");
      setIsLoadingProducts(false); // Stop product loading state
    }
  }, [idToken, isAuthLoading]); // Dependencies on idToken and isAuthLoading

  // --- Dialog Handlers ---
  const handleOpenDialog = (product: Partial<AffiliateProduct> | null = null) => {
    const initialData = product || {
      title: '',
      description: '',
      imageUrl: '',
      baseLink: '',
      price: 0,
      baseCommission: 0,
      isActive: true,
      totalClicks: 0,
      totalEarnings: 0,
    };
    setCurrentProduct({ ...initialData, price: initialData.price ?? 0 });
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    if (isSubmitting) {
      toast.info("Please wait, product submission is in progress.");
      return;
    }
    setIsDialogOpen(false);
    setCurrentProduct(null);
    setImageFile(null);
  };

  // --- Form Submission Handler ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log("AffiliateAdminPage: handleSubmit function called!");

    // --- Critical Checks at the start of handleSubmit ---
    if (isAuthLoading) {
      toast.error("Authentication is still loading. Please wait a moment.");
      console.error("AffiliateAdminPage: handleSubmit - Auth is still loading.");
      return;
    }
    if (!idToken) {
      toast.error("Authentication needed. Please log in again.");
      console.error("AffiliateAdminPage: handleSubmit - idToken is null. User is likely not authenticated.");
      return;
    }
    if (!currentProduct) {
      toast.error("Form data is missing. Please try again.");
      console.error("AffiliateAdminPage: handleSubmit - currentProduct is null.");
      return;
    }
    if (!currentProduct.title || !currentProduct.baseLink || currentProduct.baseCommission === undefined || currentProduct.price === undefined) {
      toast.error("Please fill in all required fields: Title, Base Link, Price, and Commission Rate.");
      console.warn("AffiliateAdminPage: handleSubmit - Required fields missing.", currentProduct);
      return;
    }

    setIsSubmitting(true);
    let productData = { ...currentProduct };

    try {
      // 1. Handle image upload if a new file is selected
      if (imageFile) {
        toast.info("Uploading image...");
        const filePath = `product-images/${uuidv4()}_${imageFile.name}`; // Path within the bucket
        console.log(`AffiliateAdminPage: Attempting to upload image to: ${filePath}`);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('affiliate-product-images') // Ensure this bucket exists and matches exactly
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Supabase upload error: ${uploadError.message}. Make sure the bucket 'affiliate-product-images' exists and has correct RLS policies.`);
        }

        const { data: urlData } = supabase.storage.from('affiliate-product-images').getPublicUrl(filePath);
        productData.imageUrl = urlData.publicUrl;
        toast.success("Image uploaded!");
        console.log("AffiliateAdminPage: Image public URL:", productData.imageUrl);
      }

      // 2. Prepare API call
      const apiUrl = currentProduct.id
        ? `/api/admin/affiliate-products/${currentProduct.id}`
        : '/api/admin/affiliate-products';
      const method = currentProduct.id ? 'PUT' : 'POST';

      console.log(`AffiliateAdminPage: Sending ${method} request to ${apiUrl} with data:`, productData);

      // 3. Call the API to save product data
      toast.info(`Saving product details...`);
      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${currentProduct.id ? 'update' : 'create'} product. Status: ${response.status}`);
      }

      toast.success(`Product ${currentProduct.id ? 'updated' : 'created'} successfully!`);
      await fetchProducts(); // Refresh the list of products after successful operation
      handleDialogClose(); // Close the dialog
    } catch (error: any) {
      console.error("AffiliateAdminPage: Submission failed:", error);
      toast.error('Submission failed', { description: error.message || 'An unknown error occurred.' });
    } finally {
      setIsSubmitting(false); // Always reset submission state
    }
  };

  // --- Delete Handler ---
  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }
    if (isAuthLoading) {
      toast.error("Authentication is still loading. Cannot delete.");
      return;
    }
    if (!idToken) {
      toast.error("Authentication required to delete product.");
      return;
    }

    try {
      toast.info("Deleting product...");
      const response = await fetch(`/api/admin/affiliate-products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${idToken}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }

      toast.success('Product deleted successfully!');
      fetchProducts();
    } catch (error: any) {
      console.error("AffiliateAdminPage: Deletion failed:", error);
      toast.error('Deletion failed', { description: error.message });
    }
  };

  const ProductForm = useMemo(() => (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="title" className="text-right">Title</Label>
        <Input
          id="title"
          value={currentProduct?.title || ''}
          onChange={(e) => setCurrentProduct({ ...currentProduct, title: e.target.value })}
          className="col-span-3"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right">Description</Label>
        <Textarea
          id="description"
          value={currentProduct?.description || ''}
          onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="imageFile" className="text-right">Image</Label>
        <div className="col-span-3">
          <Input
            id="imageFile"
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          {(currentProduct?.imageUrl || imageFile) && (
            <div className="mt-2 p-2 border rounded-md">
              <Image
                src={imageFile ? URL.createObjectURL(imageFile) : currentProduct?.imageUrl!}
                alt="Image Preview"
                width={80}
                height={80}
                className="object-cover rounded-md"
                unoptimized={imageFile ? true : false}
              />
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="baseLink" className="text-right">Base Link</Label>
        <Input
          id="baseLink"
          value={currentProduct?.baseLink || ''}
          onChange={(e) => setCurrentProduct({ ...currentProduct, baseLink: e.target.value })}
          className="col-span-3"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="price" className="text-right">Price (₦)</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          value={currentProduct?.price ?? 0}
          onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) || 0 })}
          className="col-span-3"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="baseCommission" className="text-right">Commission Rate (%)</Label>
        <Input
          id="baseCommission"
          type="number"
          step="1"
          value={currentProduct?.baseCommission ?? 0}
          onChange={(e) => setCurrentProduct({ ...currentProduct, baseCommission: parseFloat(e.target.value) || 0 })}
          className="col-span-3"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="isActive" className="text-right">Active</Label>
        <Switch
          id="isActive"
          checked={currentProduct?.isActive ?? true}
          onCheckedChange={(checked) => setCurrentProduct({ ...currentProduct, isActive: checked })}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleDialogClose} disabled={isSubmitting || isAuthLoading}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting || isAuthLoading}>
          {isSubmitting ? 'Saving...' : (isAuthLoading ? 'Authenticating...' : 'Save Product')}
        </Button>
      </DialogFooter>
    </form>
  ), [currentProduct, isSubmitting, imageFile, handleSubmit, handleDialogClose, isAuthLoading]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Affiliate Products</h1>
          <p className="text-muted-foreground">Manage your affiliate products here.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/admin/manual-sale">Record a Sale</Link>
          </Button>
          <Button onClick={() => handleOpenDialog()} disabled={isAuthLoading || isLoadingProducts}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {isAuthLoading ? (
        <p className="text-center text-lg py-10">Checking authentication...</p>
      ) : isLoadingProducts ? (
        <p className="text-center text-lg py-10">Loading products...</p>
      ) : products.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg text-muted-foreground">
          <h2 className="text-xl font-semibold mb-2">No Products Found</h2>
          <p className="mt-2">Click "Add Product" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => handleOpenDialog(product)}
              onDelete={() => handleDelete(product.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="sm:max-w-[425px]"
          onInteractOutside={(e) => {
            if (isSubmitting) {
              e.preventDefault();
              toast.info("Please wait, product submission is in progress.");
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{currentProduct?.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          {ProductForm}
        </DialogContent>
      </Dialog>
    </div>
  );
}
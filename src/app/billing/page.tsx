
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { FileText, Download, Banknote, Smartphone, Mail, Trash2, Wallet, Send } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  serviceTitle: string;
  amount: number;
  status: 'Pagada' | 'Pendiente' | 'Pago Rechazado';
}

const mockInvoicesData: Invoice[] = [
  { id: 'inv1', invoiceNumber: 'FACT-00123', date: '2024-08-15', serviceTitle: 'Entrenamiento Fitness Personalizado - Julio', amount: 180000, status: 'Pagada' },
  { id: 'inv2', invoiceNumber: 'FACT-00124', date: '2025-05-17', serviceTitle: 'Clases Particulares de Matemáticas - Agosto', amount: 120000, status: 'Pendiente' },
  { id: 'inv3', invoiceNumber: 'FACT-00125', date: '2025-02-01', serviceTitle: 'Desarrollo Web Frontend - Proyecto X', amount: 1500000, status: 'Pagada' },
  { id: 'inv4', invoiceNumber: 'FACT-00126', date: '2024-09-05', serviceTitle: 'Consultoría SEO - Paquete Básico', amount: 350000, status: 'Pago Rechazado' },
  { id: 'inv5', invoiceNumber: 'FACT-00127', date: '2025-05-17', serviceTitle: 'Diseño de Logo y Branding', amount: 700000, status: 'Pendiente' },
];

interface PayoutAccountBase {
  id: string;
  accountHolderName?: string;
  isPrimary?: boolean;
}
interface ColombianPayoutMethod extends PayoutAccountBase {
  type: 'bancolombia' | 'nequi';
  accountNumber: string;
}
interface PayPalPayoutMethod extends PayoutAccountBase {
  type: 'paypal';
  email: string;
}
type UserPayoutMethod = ColombianPayoutMethod | PayPalPayoutMethod;


const STORED_INVOICES_KEY = 'storedInvoices';
const STORED_PAYOUT_METHODS_KEY = 'storedUserPayoutMethods';
const MOCK_AVAILABLE_BALANCE = 500000; 


const BillingContent = () => {
  const { user, isLoggedIn, isLoading, openLoginDialog } = useAuth();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isInvoiceDataLoading, setIsInvoiceDataLoading] = useState(true);

  const [payoutMethodType, setPayoutMethodType] = useState<'bancolombia' | 'nequi' | 'paypal' | ''>('');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
  const [payoutAccountHolderName, setPayoutAccountHolderName] = useState('');
  const [payoutPaypalEmail, setPayoutPaypalEmail] = useState('');
  const [savedPayoutMethods, setSavedPayoutMethods] = useState<UserPayoutMethod[]>([]);

  const [availableBalance, setAvailableBalance] = useState(MOCK_AVAILABLE_BALANCE);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [selectedPayoutMethodForWithdrawal, setSelectedPayoutMethodForWithdrawal] = useState<string | undefined>(undefined);


  useEffect(() => {
    if (isLoggedIn) {
      setIsInvoiceDataLoading(true);
      try {
        const storedInvoicesRaw = localStorage.getItem(STORED_INVOICES_KEY);
        if (storedInvoicesRaw) {
          const stored = JSON.parse(storedInvoicesRaw) as Invoice[];
          setInvoices(prev => [...stored, ...mockInvoicesData.filter(mock => !stored.some(s => s.id === mock.id))]);
        } else {
          setInvoices(mockInvoicesData);
        }
      } catch (error) { console.error("Error loading invoices:", error); setInvoices(mockInvoicesData); }

      try {
        const storedPayoutsRaw = localStorage.getItem(STORED_PAYOUT_METHODS_KEY);
        if (storedPayoutsRaw) setSavedPayoutMethods(JSON.parse(storedPayoutsRaw) as UserPayoutMethod[]);
      } catch (error) { console.error("Error loading payout methods:", error); }
      
      setIsInvoiceDataLoading(false);
    } else {
      setIsInvoiceDataLoading(false);
      setInvoices([]);
      setSavedPayoutMethods([]);
    }
  }, [isLoggedIn, user]);


  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem(STORED_PAYOUT_METHODS_KEY, JSON.stringify(savedPayoutMethods));
    }
  }, [savedPayoutMethods, isLoggedIn]);


  const handleDownloadPdf = (invoiceNumber: string) => {
    console.log(`Simulando descarga de PDF para factura N° ${invoiceNumber}`);
    toast({ title: "Descarga de PDF (Simulación)", description: `Aquí se iniciaría la descarga del PDF para la factura N° ${invoiceNumber}.` });
  };

  const getStatusBadgeVariant = (status: Invoice['status']): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (status === 'Pagada') return 'default';
    if (status === 'Pendiente') return 'secondary';
    if (status === 'Pago Rechazado') return 'destructive';
    return 'outline';
  };
  
  const handleSavePayoutMethod = () => {
    if (!payoutMethodType) {
      toast({ title: 'Información Incompleta', description: 'Selecciona un tipo de cuenta para desembolso.', variant: 'destructive' });
      return;
    }

    let newMethod: UserPayoutMethod | null = null;
    const baseId = `payout-${Date.now()}`;

    if (payoutMethodType === 'bancolombia' || payoutMethodType === 'nequi') {
      if (!payoutAccountNumber) {
        toast({ title: 'Información Incompleta', description: 'Ingresa el número de cuenta/celular.', variant: 'destructive' });
        return;
      }
      newMethod = {
        id: baseId,
        type: payoutMethodType,
        accountNumber: payoutAccountNumber,
        accountHolderName: payoutAccountHolderName || user?.name,
      };
    } else if (payoutMethodType === 'paypal') {
      if (!payoutPaypalEmail) {
        toast({ title: 'Información Incompleta', description: 'Ingresa tu correo de PayPal.', variant: 'destructive' });
        return;
      }
      newMethod = {
        id: baseId,
        type: 'paypal',
        email: payoutPaypalEmail,
        accountHolderName: payoutAccountHolderName || user?.name,
      };
    }

    if (newMethod) {
      setSavedPayoutMethods(prev => [...prev, newMethod!]);
      toast({ title: 'Método de Desembolso Guardado (Simulación)', description: `Tu método de desembolso (${payoutMethodType}) ha sido guardado.` });
      setPayoutMethodType(''); setPayoutAccountNumber(''); setPayoutAccountHolderName(''); setPayoutPaypalEmail('');
    }
  };

  const handleDeletePayoutMethod = (id: string) => {
    setSavedPayoutMethods(prev => prev.filter(pm => pm.id !== id));
    toast({ title: 'Método de Desembolso Eliminado (Simulación)'});
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Monto Inválido', description: 'Ingresa un monto válido para retirar.', variant: 'destructive' });
      return;
    }
    if (amount > availableBalance) {
      toast({ title: 'Saldo Insuficiente', description: 'No puedes retirar más de tu saldo disponible.', variant: 'destructive' });
      return;
    }
    if (!selectedPayoutMethodForWithdrawal) {
      toast({ title: 'Método de Desembolso No Seleccionado', description: 'Selecciona a dónde enviar el dinero.', variant: 'destructive' });
      return;
    }
    const selectedMethodDetails = savedPayoutMethods.find(pm => pm.id === selectedPayoutMethodForWithdrawal);

    console.log(`Simulación: Retirando ${amount} COP a ${selectedMethodDetails?.type} (${selectedMethodDetails?.type === 'paypal' ? (selectedMethodDetails as PayPalPayoutMethod).email : (selectedMethodDetails as ColombianPayoutMethod).accountNumber})`);
    toast({
      title: 'Retiro Solicitado (Simulación)',
      description: `Se han solicitado ${amount.toLocaleString('es-CO', {style: 'currency', currency: 'COP'})} para desembolso a tu cuenta ${selectedMethodDetails?.type}.`,
    });
    setAvailableBalance(prev => prev - amount);
    setIsWithdrawDialogOpen(false);
    setWithdrawAmount('');
    setSelectedPayoutMethodForWithdrawal(undefined);
  };


  if (isLoading) {
    return <div className="flex flex-col flex-grow items-center justify-center p-4"><p>Cargando facturación...</p></div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center p-4">
        <div className="p-6 md:p-8 flex flex-col items-center text-center border rounded-lg bg-card shadow-lg max-w-md">
          <FileText className="h-16 w-16 text-muted-foreground/50 mb-6" />
          <h2 className="text-xl font-medium mb-2 text-foreground">Acceso Restringido a Facturación</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">Debes iniciar sesión o crear una cuenta para gestionar tu facturación.</p>
          <Button onClick={openLoginDialog}>Iniciar Sesión / Crear Cuenta</Button>
        </div>
      </div>
    );
  }

  const isProfessional = user?.profileType === 'profesional' || user?.profileType === 'propietario_espacio';

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold flex items-center">
            <FileText className="mr-3 h-7 w-7 text-primary" /> Historial de Facturas
          </h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Consulta todas tus facturas generadas. {user && <span className="block text-sm mt-1">Email de facturación: {user.email}</span>}
        </p>
        <Card>
          <CardHeader><CardTitle>Tus Facturas</CardTitle><CardDescription>Listado de todas tus facturas.</CardDescription></CardHeader>
          <CardContent>
            {isInvoiceDataLoading ? <div className="flex justify-center items-center h-40"><p>Cargando facturas...</p></div>
              : invoices.length === 0 ? (
                <div className="text-center text-muted-foreground py-10 border rounded-md bg-muted/30">
                  <FileText className="mx-auto h-10 w-10 mb-3 text-muted-foreground/70" />
                  <p className="font-medium">No tienes facturas disponibles.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Factura</TableHead><TableHead>Fecha</TableHead><TableHead>Servicio</TableHead>
                        <TableHead className="text-right">Monto (COP)</TableHead><TableHead>Estado</TableHead><TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{new Date(invoice.date + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                          <TableCell>{invoice.serviceTitle}</TableCell>
                          <TableCell className="text-right">{invoice.amount.toLocaleString('es-CO')}</TableCell>
                          <TableCell><Badge variant={getStatusBadgeVariant(invoice.status)} className="capitalize">{invoice.status}</Badge></TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(invoice.invoiceNumber)} title="Descargar PDF"><Download className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {isProfessional && (
        <>
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-semibold flex items-center">
                <Wallet className="mr-3 h-7 w-7 text-primary" /> Tu Cuenta de Ganancias
              </h2>
            </div>
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl">Saldo Actual en Cuenta</CardTitle>
                    <CardDescription>El total de tus ganancias listas para ser retiradas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold text-primary">
                        {availableBalance.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                    </p>
                </CardContent>
                <CardFooter>
                    <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto" disabled={availableBalance <= 0 || savedPayoutMethods.length === 0}>
                                <Send className="mr-2 h-4 w-4" /> Solicitar Desembolso
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Solicitar Desembolso</DialogTitle>
                                <DialogDescription>
                                    Ingresa el monto y selecciona dónde deseas recibir tu dinero.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <p className="text-sm text-muted-foreground">
                                    Saldo disponible para retirar: <span className="font-semibold text-foreground">{availableBalance.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span>
                                </p>
                                <div className="space-y-1">
                                    <Label htmlFor="withdraw-amount">Monto a Retirar (COP)</Label>
                                    <Input
                                        id="withdraw-amount"
                                        type="number"
                                        placeholder="Ej: 100000"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                    />
                                </div>
                                {savedPayoutMethods.length > 0 ? (
                                    <div className="space-y-2">
                                        <Label>Selecciona tu método de desembolso:</Label>
                                        <RadioGroup value={selectedPayoutMethodForWithdrawal} onValueChange={setSelectedPayoutMethodForWithdrawal}>
                                            {savedPayoutMethods.map((method) => (
                                                <div key={method.id} className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                                    <RadioGroupItem value={method.id} id={`payout-option-${method.id}`} />
                                                    <Label htmlFor={`payout-option-${method.id}`} className="flex-grow cursor-pointer text-sm">
                                                        <div className="flex items-center">
                                                          {method.type === 'bancolombia' ? <Banknote className="mr-2 h-4 w-4 text-muted-foreground" />
                                                           : method.type === 'nequi' ? <Smartphone className="mr-2 h-4 w-4 text-muted-foreground" />
                                                           : <Mail className="mr-2 h-4 w-4 text-muted-foreground" />}
                                                           <span className="font-medium capitalize">
                                                              {method.type === 'bancolombia' ? 'Bancolombia' : method.type}
                                                           </span>
                                                           <span className="text-xs text-muted-foreground ml-2">
                                                            {method.type === 'paypal' ? (method as PayPalPayoutMethod).email : `****${(method as ColombianPayoutMethod).accountNumber.slice(-4)}`}
                                                           </span>
                                                        </div>
                                                        {method.accountHolderName && <p className="text-xs text-muted-foreground ml-6">Titular: {method.accountHolderName}</p>}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>
                                ) : (
                                    <p className="text-sm text-destructive">No tienes métodos de desembolso configurados. Por favor, añade uno primero.</p>
                                )}
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                                <Button onClick={handleWithdraw} disabled={!withdrawAmount || !selectedPayoutMethodForWithdrawal || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > availableBalance}>
                                    Confirmar Desembolso (Simulación)
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                     {availableBalance <= 0 && <p className="ml-4 text-sm text-muted-foreground">No tienes saldo para retirar.</p>}
                     {availableBalance > 0 && savedPayoutMethods.length === 0 && <p className="ml-4 text-sm text-destructive">Configura un método de desembolso para poder retirar.</p>}
                </CardFooter>
             </Card>
          </div>

          <Separator className="my-8" />
        </>
      )}

      {isProfessional && (
           <div>
             <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-semibold flex items-center">
                  <Banknote className="mr-3 h-7 w-7 text-primary" />
                  Tu Cuenta para Recibir Dinero de Clientes
              </h2>
             </div>
             <p className="text-muted-foreground mb-6">
              Configura aquí la cuenta donde recibirás el dinero de los pagos realizados por tus clientes por los servicios o espacios que ofreces.
             </p>

            <Card>
              <CardHeader>
                <CardTitle>Añadir Método de Desembolso</CardTitle>
                <CardDescription>Configura tu cuenta Bancolombia, Nequi o PayPal para recibir tus ganancias.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="payout-method-type">Tipo de Cuenta</Label>
                  <Select value={payoutMethodType} onValueChange={(value) => setPayoutMethodType(value as any)}>
                    <SelectTrigger id="payout-method-type"><SelectValue placeholder="Selecciona un tipo de cuenta" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bancolombia"><div className="flex items-center"><Banknote className="mr-2 h-4 w-4" /> Bancolombia</div></SelectItem>
                      <SelectItem value="nequi"><div className="flex items-center"><Smartphone className="mr-2 h-4 w-4" /> Nequi</div></SelectItem>
                      <SelectItem value="paypal"><div className="flex items-center"><Mail className="mr-2 h-4 w-4" /> PayPal</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {payoutMethodType && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="payout-account-holder-name">Nombre del Titular (Opcional)</Label>
                      <Input id="payout-account-holder-name" placeholder="Ej: Nombre Apellido" value={payoutAccountHolderName} onChange={(e) => setPayoutAccountHolderName(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Si se deja vacío, se usará el nombre de tu perfil.</p>
                    </div>
                    {(payoutMethodType === 'bancolombia' || payoutMethodType === 'nequi') && (
                      <div className="space-y-2">
                        <Label htmlFor="payout-account-number">
                          {payoutMethodType === 'bancolombia' ? 'Número de Cuenta Bancolombia' : 'Número de Celular Nequi'}
                        </Label>
                        <Input id="payout-account-number" type={payoutMethodType === 'nequi' ? 'tel' : 'text'} placeholder={payoutMethodType === 'bancolombia' ? 'Ej: 1234567890' : 'Ej: 3001234567'} value={payoutAccountNumber} onChange={(e) => setPayoutAccountNumber(e.target.value)} />
                      </div>
                    )}
                    {payoutMethodType === 'paypal' && (
                       <div className="space-y-2">
                        <Label htmlFor="payout-paypal-email">Correo Electrónico de PayPal</Label>
                        <Input id="payout-paypal-email" type="email" placeholder="tu@correo.com" value={payoutPaypalEmail} onChange={(e) => setPayoutPaypalEmail(e.target.value)} />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={handleSavePayoutMethod} disabled={!payoutMethodType || (payoutMethodType === 'paypal' ? !payoutPaypalEmail : !payoutAccountNumber) }>
                  Guardar Método de Desembolso (Simulación)
                </Button>
              </CardFooter>
            </Card>

            {savedPayoutMethods.length > 0 && (
               <Card className="mt-6">
                  <CardHeader><CardTitle>Métodos de Desembolso Guardados</CardTitle></CardHeader>
                  <CardContent>
                      <ul className="space-y-3">
                          {savedPayoutMethods.map((method) => (
                              <li key={method.id} className="flex justify-between items-center p-3 border rounded-md bg-muted/50">
                                  <div className="flex items-center">
                                      {method.type === 'bancolombia' ? <Banknote className="mr-3 h-5 w-5 text-primary" /> 
                                       : method.type === 'nequi' ? <Smartphone className="mr-3 h-5 w-5 text-primary" />
                                       : <Mail className="mr-3 h-5 w-5 text-primary" />}
                                      <div>
                                          <p className="font-medium text-sm capitalize">{method.type === 'bancolombia' ? 'Bancolombia' : method.type === 'nequi' ? 'Nequi' : 'PayPal'}</p>
                                          <p className="text-xs text-muted-foreground">
                                              {method.type === 'paypal' ? `Email: ${(method as PayPalPayoutMethod).email}` 
                                               : `${method.type === 'bancolombia' ? 'Cuenta' : 'Celular'}: ****${(method as ColombianPayoutMethod).accountNumber.slice(-4)}`}
                                          </p>
                                          {method.accountHolderName && <p className="text-xs text-muted-foreground">Titular: {method.accountHolderName}</p>}
                                      </div>
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeletePayoutMethod(method.id)} title="Eliminar método">
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </li>
                          ))}
                      </ul>
                  </CardContent>
               </Card>
            )}
           </div>
      )}
    </div>
  );
};

const BillingPage = () => {
  return (
    <AppLayout>
      <BillingContent />
    </AppLayout>
  );
};

export default BillingPage;


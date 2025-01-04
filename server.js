import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';

// Inizializza l'app Express
const app = express();

// Inizializza Stripe con la chiave segreta
const stripe = Stripe('sk_test_51QcrzACQTsckZ9PwC5GyWBdKxo9DETZzI0jusIcEDlbzlcGkSOqdBaYaQVtOrvYGVkp46UUsLa5IFT44HYQKBdrS00RyRHcS5O');

// Configura CORS
const corsOptions = {
  origin: [
    /^https:\/\/turing-[a-z0-9-]+-turing-team1\.vercel\.app$/,
    'https://turing-5g9oph8lz-turing-team1.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Endpoint di test
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Endpoint per creare il Payment Intent
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount' 
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'eur',
      payment_method_options: {
        card: {
          request_three_d_secure: 'any'
        }
      },
      metadata: {
        integration_check: 'accept_a_payment',
      }
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    if (error.type === 'StripeCardError') {
      return res.status(402).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'An error occurred while processing your payment.' 
    });
  }
});

// Endpoint per verificare il pagamento
app.post('/verify-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'PaymentIntent ID richiesto' 
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      res.json({ 
        success: true,
        paymentId: paymentIntent.id
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Pagamento non completato',
        status: paymentIntent.status
      });
    }
  } catch (error) {
    console.error('Errore verifica pagamento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante la verifica del pagamento' 
    });
  }
});

// Avvia il server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('CORS configured for:', corsOptions.origin);
});


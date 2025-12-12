
import numpy as np
import os
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, regularizers, backend as K
import matplotlib.pyplot as plt

# ====================================================
# CONFIGURATION
# ====================================================
# Detect if running in Colab (usually /content is writable)
if os.path.exists("/content"):
    BASE_DIR = "/content"
    DATA_DIR = os.path.join(BASE_DIR, "deep_model_data")
    MODEL_DIR = os.path.join(BASE_DIR, "models_production")
else:
    # Local Windows Env
    BASE_DIR = r"d:/forecast"
    DATA_DIR = os.path.join(BASE_DIR, "deep_model_data")
    MODEL_DIR = os.path.join(BASE_DIR, "models_production")

TRAIN_FILE = os.path.join(DATA_DIR, "train_data.npz")
VAL_FILE = os.path.join(DATA_DIR, "val_data.npz")
META_FILE = os.path.join(DATA_DIR, "meta_data.pkl")

MODEL_PATH = os.path.join(MODEL_DIR, "best_physics_dl_pm25_model.keras")
PLOT_PATH = os.path.join(MODEL_DIR, "training_loss.png")

os.makedirs(MODEL_DIR, exist_ok=True)

# 4️⃣ TRAINING REGULARIZATION config
BATCH_SIZE = 32          # Reduced from 128/256 for stable gradients
EPOCHS = 100 
PATIENCE = 5             # EarlyStopping patience
LEARNING_RATE = 1e-3
CLIP_NORM = 1.0          # Gradient clipping

# Physics Loss Weights (Annealed)
# We will start curvature penalty at 0 and ramp up
MAX_PHYS_WEIGHT = 0.001 

# Target Scaling
TARGET_SCALE = 1000.0    # Divide y by 1000 to get [0,1] roughly

class DataGenerator(keras.utils.Sequence):
    """
    Generates data for Keras with:
    1. Broadcasting station IDs
    2. Scaling targets to [0, 1]
    """
    def __init__(self, data_file, batch_size=32, shuffle=True):
        self.data_file = data_file
        self.batch_size = batch_size
        self.shuffle = shuffle
        
        print(f"Loading {data_file}...")
        data = np.load(data_file)
        self.X_cont = data['X_cont']
        self.X_stat = data['X_stat']
        self.y = data['y']
        
        # 5️⃣ NORMALIZATION PIPELINE FIX: Target Scaling
        # We do it on load or on getter? On load is faster if RAM allows.
        # Targets are float32.
        self.y = self.y / TARGET_SCALE
        
        # Clip extreme outliers in targets just in case (e.g. > 1.0 which is > 1000 PM2.5)
        self.y = np.clip(self.y, 0.0, 1.0)
        
        self.indexes = np.arange(len(self.y))
        self.on_epoch_end()
        
    def __len__(self):
        return int(np.floor(len(self.y) / self.batch_size))
        
    def __getitem__(self, index):
        indexes = self.indexes[index*self.batch_size:(index+1)*self.batch_size]
        
        X_c_batch = self.X_cont[indexes]
        X_s_batch = self.X_stat[indexes]
        y_batch = self.y[indexes]
        
        # Broadcasting Station ID: (Batch,) -> (Batch, SeqLen)
        seq_len = X_c_batch.shape[1]
        X_s_batch = np.repeat(X_s_batch[:, np.newaxis], seq_len, axis=1)
        
        return {"cont_in": X_c_batch, "station_in": X_s_batch}, y_batch
        
    def on_epoch_end(self):
        if self.shuffle:
            np.random.shuffle(self.indexes)
            
def load_metadata():
    import joblib
    meta = joblib.load(META_FILE)
    return len(meta['unique_stations']), len(meta['feature_names'])

# ====================================================
# PHYSICS-INFORMED LOSS (SCALED)
# ====================================================
# Variable wrapper for annealing
phys_weight = tf.Variable(0.0, trainable=False, dtype=tf.float32)

def physics_loss(y_true, y_pred):
    # y values are in [0, 1] range now (approx)
    
    # 1. Base MSE
    mse = tf.reduce_mean(tf.square(y_true - y_pred))
    
    # 2. Extreme Penalty (Constraint)
    # 500 ug/m3 => 0.5 in scaled space
    # 800 ug/m3 => 0.8
    limit = 0.5 # 500 ug/m3
    over_limit = tf.nn.relu(y_pred - limit)
    penalty_high = tf.reduce_mean(tf.square(over_limit))
    
    # 3. Smoothness Penalty
    pred_24 = y_pred[:, 0]
    pred_48 = y_pred[:, 1]
    pred_72 = y_pred[:, 2]
    
    d1 = pred_48 - pred_24
    d2 = pred_72 - pred_48
    
    # Curvature: (d2 - d1)^2
    curvature = tf.square(d1 - d2)
    penalty_smooth = tf.reduce_mean(curvature)
    
    # Total
    total_loss = mse + phys_weight * (penalty_high + penalty_smooth)
    return total_loss

class LossAnnealer(keras.callbacks.Callback):
    """
    Ramps up physics weight from 0 to MAX_PHYS_WEIGHT over N epochs.
    3️⃣ PHYSICS LOSS REBALANCING
    """
    def __init__(self, max_weight, ramp_epochs=10):
        super().__init__()
        self.max_weight = max_weight
        self.ramp_epochs = ramp_epochs

    def on_epoch_begin(self, epoch, logs=None):
        if epoch < self.ramp_epochs:
            new_val = self.max_weight * (epoch / self.ramp_epochs)
        else:
            new_val = self.max_weight
            
        K.set_value(phys_weight, new_val)
        # print(f"  [Physics Weight]: {new_val:.6f}")

# ====================================================
# MODEL ARCHITECTURE (REDUCED CAPACITY)
# ====================================================
def build_model(seq_len, num_features, num_stations):
    print("2️⃣ Building Stable Physics-Aware Model...")
    
    # Inputs
    input_cont = keras.Input(shape=(seq_len, num_features), name="cont_in") 
    input_stat = keras.Input(shape=(seq_len,), name="station_in")
    
    # Station Embedding
    emb_dim = 4 # Reduced from 8
    stat_emb = layers.Embedding(input_dim=num_stations+1, output_dim=emb_dim, name="station_embedding")(input_stat)
    
    # Concatenate
    x = layers.Concatenate(axis=-1)([input_cont, stat_emb])
    
    # 2️⃣ CAPACITY REDUCTION: Single BiLSTM
    x = layers.Bidirectional(layers.LSTM(64, return_sequences=False))(x)
    
    # Dropout
    x = layers.Dropout(0.4)(x)
    
    # Dense with L2
    x = layers.Dense(32, activation='relu', kernel_regularizer=regularizers.l2(1e-4))(x)
    
    # Output Layer
    # Use 'sigmoid' because target is scaled [0, 1]
    # or 'softplus' approx 0 but unbounded?
    # User suggested 'sigmoid' implies strict [0,1].
    # But if real pollution > 1000, we clip. Acceptable for stability.
    outputs = layers.Dense(3, activation='sigmoid', name="prediction")(x)
    
    model = keras.Model(inputs=[input_cont, input_stat], outputs=outputs)
    return model

def run_training():
    print("1️⃣ Loading Metadata...")
    if not os.path.exists(TRAIN_FILE):
        raise FileNotFoundError(f"Training data not found: {TRAIN_FILE}")
        
    num_stats, num_feat = load_metadata()
    print(f"Stats: {num_stats}, Feats: {num_feat}")
    
    # generators
    train_gen = DataGenerator(TRAIN_FILE, BATCH_SIZE, shuffle=True)
    val_gen = DataGenerator(VAL_FILE, BATCH_SIZE, shuffle=False)
    
    sample_X, sample_y = train_gen[0]
    seq_len = sample_X['cont_in'].shape[1]
    print(f"Sequence Length: {seq_len}")
    
    model = build_model(seq_len, num_feat, num_stats)
    model.summary()
    
    print("\n3️⃣ Compiling with Physics Loss...")
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE, clipnorm=CLIP_NORM),
        loss=physics_loss,
        metrics=['mae']
    )
    
    # Callbacks
    callbacks = [
        keras.callbacks.EarlyStopping(monitor='val_loss', patience=PATIENCE, restore_best_weights=True),
        keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, verbose=1),
        keras.callbacks.ModelCheckpoint(MODEL_PATH, monitor='val_loss', save_best_only=True),
        LossAnnealer(max_weight=MAX_PHYS_WEIGHT, ramp_epochs=10)
    ]
    
    print("\n4️⃣ Starting Training...")
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=EPOCHS,
        callbacks=callbacks
    )
    
    print(f"✅ Training Complete. Best model saved to {MODEL_PATH}")
    
    # Plotting
    plt.figure(figsize=(10, 6))
    plt.plot(history.history['loss'], label='Train Loss')
    plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.title('Physics-Informed Training Loss (Scaled)')
    plt.xlabel('Epochs')
    plt.ylabel('Loss (Scaled)')
    plt.legend()
    plt.savefig(PLOT_PATH)
    print(f"Loss plot saved to {PLOT_PATH}")

if __name__ == "__main__":
    run_training()

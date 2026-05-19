import numpy as np
from sklearn.svm import SVC
import pickle
import os

def generate_synthetic_data(num_identities=100, samples_per_id=15, dim=128):
    X = []
    y = []
    
    print(f"Generating base identities: {num_identities}")
    identities = [np.random.rand(dim) for _ in range(num_identities)]
    
    all_samples = []
    all_labels = []
    for i, base_emb in enumerate(identities):
        for _ in range(samples_per_id):
            noise = np.random.normal(0, 0.05, dim)
            sample = base_emb + noise
            sample = sample / np.linalg.norm(sample)
            all_samples.append(sample)
            all_labels.append(i)
            
    print("Creating positive pairs (same person)...")
    for i in range(len(all_samples)):
        for j in range(i + 1, len(all_samples)):
            if all_labels[i] == all_labels[j]:
                diff = np.abs(all_samples[i] - all_samples[j])
                X.append(diff)
                y.append(1)
                
    num_positives = len(y)
    print(f"Created {num_positives} positive pairs.")
    
    print("Creating negative pairs (different person)...")
    neg_count = 0
    for i in range(len(all_samples)):
        for j in range(i + 1, len(all_samples)):
            if all_labels[i] != all_labels[j]:
                diff = np.abs(all_samples[i] - all_samples[j])
                X.append(diff)
                y.append(0)
                neg_count += 1
                if neg_count >= num_positives:
                    break
        if neg_count >= num_positives:
            break
            
    print(f"Created {neg_count} negative pairs.")
    return np.array(X), np.array(y)

def train_and_save_svm(model_path='svm_model.pkl'):
    print("Dataset preparation for 128-d embeddings...")
    X, y = generate_synthetic_data()
    
    print(f"Training SVM on {len(X)} pairs...")
    svm_clf = SVC(kernel='rbf', probability=True, gamma='scale')
    svm_clf.fit(X, y)
    
    print(f"Saving trained SVM model to {model_path}...")
    with open(model_path, 'wb') as f:
        pickle.dump(svm_clf, f)
    print("SVM Training complete.")

if __name__ == '__main__':
    # Make sure we save it in the same directory as this script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, 'svm_model.pkl')
    train_and_save_svm(model_path)

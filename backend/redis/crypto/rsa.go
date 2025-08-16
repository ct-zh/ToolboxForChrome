package crypto

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
)

// RSADecryptor RSA解密器
type RSADecryptor struct {
	privateKey *rsa.PrivateKey
}

// NewRSADecryptor 创建新的RSA解密器
func NewRSADecryptor(privateKeyPEM string) (*RSADecryptor, error) {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return nil, errors.New("failed to decode PEM block containing private key")
	}

	privateKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %v", err)
	}

	rsaPrivateKey, ok := privateKey.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("not an RSA private key")
	}

	return &RSADecryptor{
		privateKey: rsaPrivateKey,
	}, nil
}

// DecryptPassword 解密密码
func (r *RSADecryptor) DecryptPassword(encryptedPassword string) (string, error) {
	// Base64解码
	ciphertext, err := base64.StdEncoding.DecodeString(encryptedPassword)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %v", err)
	}

	// RSA解密
	plaintext, err := rsa.DecryptPKCS1v15(rand.Reader, r.privateKey, ciphertext)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %v", err)
	}

	return string(plaintext), nil
}

// GetPublicKeyPEM 获取公钥PEM格式字符串
func (r *RSADecryptor) GetPublicKeyPEM() (string, error) {
	publicKey := &r.privateKey.PublicKey
	publicKeyDER, err := x509.MarshalPKIXPublicKey(publicKey)
	if err != nil {
		return "", fmt.Errorf("failed to marshal public key: %v", err)
	}

	publicKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyDER,
	})

	return string(publicKeyPEM), nil
}